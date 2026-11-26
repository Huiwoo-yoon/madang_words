-- 블록 마당 (통합 게임) — Supabase SQL Editor에 통째로 붙여 넣고 Run.
-- 타자연습·전통놀이 마당과 같은 Supabase 프로젝트를 쓴다. 모든 이름 앞에 bm_ 을 붙였고, 다른 표는 건드리지 않는다.

-- 계정당 한 줄: 모든 놀이가 같이 쓰는 것
--   points = 에메랄드(지갑), character/chars = 마당 캐릭터
--   data = { inv: {블록: 개수}, type: 타자연습 저장, kk: 끝말잇기 저장 }
create table public.bm_profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,16}$'),
  nickname text not null check (char_length(nickname) between 1 and 10),
  points bigint not null default 0 check (points >= 0),
  character text not null default 'kid',
  chars jsonb not null default '{"kid": true}',
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- (계정, 놀이)당 한 줄: 딱지치기·투호·끝말잇기·미니게임의 트로피·레벨·저장
create table public.bm_saves (
  user_id uuid not null references public.bm_profiles(id) on delete cascade,
  game text not null check (game ~ '^[a-z0-9_]{1,20}$'),
  trophies int not null default 0,
  level int not null default 1,
  data jsonb not null default '{}',
  last_trophy_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, game)
);

-- 타자연습 플레이 기록 (순위·성장 그래프용)
create table public.bm_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.bm_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  lang text not null,
  level int not null,
  play_ms int not null default 0,
  active_ms int not null default 0,
  keys int not null default 0,
  errors int not null default 0,
  words int not null default 0,
  blocks int not null default 0
);
create index bm_sessions_user_idx on public.bm_sessions (user_id, created_at);

-- 예전 계정 가져오기 기록: 같은 예전 계정은 한 번만 가져올 수 있다 (source = 'type:예전아이디uuid' 또는 'madang:…')
create table public.bm_imports (
  source text primary key,
  user_id uuid not null references public.bm_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.bm_profiles enable row level security;
alter table public.bm_saves enable row level security;
alter table public.bm_sessions enable row level security;
alter table public.bm_imports enable row level security;
create policy "내 프로필 보기" on public.bm_profiles for select using (auth.uid() = id);
create policy "내 프로필 만들기" on public.bm_profiles for insert with check (auth.uid() = id);
create policy "내 프로필 고치기" on public.bm_profiles for update using (auth.uid() = id);
create policy "내 저장 보기" on public.bm_saves for select using (auth.uid() = user_id);
create policy "내 저장 만들기" on public.bm_saves for insert with check (auth.uid() = user_id);
create policy "내 저장 고치기" on public.bm_saves for update using (auth.uid() = user_id);
create policy "내 기록 보기" on public.bm_sessions for select using (auth.uid() = user_id);
create policy "내 기록 쌓기" on public.bm_sessions for insert with check (auth.uid() = user_id);
create policy "내 가져오기 보기" on public.bm_imports for select using (auth.uid() = user_id);
create policy "내 가져오기 남기기" on public.bm_imports for insert with check (auth.uid() = user_id);

-- 새 계정은 에메랄드 0, 꼬마 캐릭터로 시작. 아이디는 바꿀 수 없다.
create or replace function public.bm_profile_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.points := 0;
    new.character := 'kid';
    new.chars := '{"kid": true}';
  else
    new.username := old.username;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger bm_profile_guard before insert or update on public.bm_profiles
for each row execute function public.bm_profile_guard();

-- 순위 조작 막기 (전통놀이 마당과 같은 규칙)
--  * 새 저장은 트로피 0, 레벨 1로 시작 — 단, 방금(10분 안) 예전 마당 계정을 가져왔으면 가져온 값을 받는다
--  * 트로피는 한 번에 1개씩만, 줄어들 수 없고, 1분에 1개보다 빨리 늘 수 없다
--  * 레벨은 1~30
create or replace function public.bm_save_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.bm_imports i where i.user_id = new.user_id
                   and i.source like 'madang:%' and now() - i.created_at < interval '10 minutes') then
      new.trophies := 0;
      new.level := 1;
    end if;
    new.last_trophy_at := null;
  else
    if new.trophies < old.trophies then
      new.trophies := old.trophies;
    elsif new.trophies > old.trophies then
      if new.trophies > old.trophies + 1
         or (old.last_trophy_at is not null and now() - old.last_trophy_at < interval '1 minute') then
        new.trophies := old.trophies;
      else
        new.last_trophy_at := now();
      end if;
    else
      new.last_trophy_at := old.last_trophy_at;
    end if;
  end if;
  new.level := least(greatest(new.level, 1), 30);
  new.updated_at := now();
  return new;
end $$;
create trigger bm_save_guard before insert or update on public.bm_saves
for each row execute function public.bm_save_guard();

-- 종합 순위: 닉네임·캐릭터·놀이별 트로피·레벨만 공개
create view public.bm_leaderboard as
select p.id, p.nickname, p.character, s.game, s.trophies, s.level
from public.bm_saves s join public.bm_profiles p on p.id = s.user_id;
grant select on public.bm_leaderboard to anon, authenticated;

-- 타자 순위: 합계만 공개 (60타 이상 친 기록 조각으로 최고 속도)
create view public.bm_type_leaderboard as
select
  p.id, p.nickname, coalesce(p.data -> 'type' ->> 'character', 'steve') as character,
  coalesce(sum(s.blocks), 0)::int as blocks,
  coalesce(sum(s.play_ms), 0)::bigint as play_ms,
  coalesce(sum(s.keys), 0)::int as keys,
  coalesce(sum(s.errors), 0)::int as errors,
  max(case when s.lang = 'ko' and s.keys >= 60 and s.active_ms > 0 then round(s.keys * 60000.0 / s.active_ms) end)::int as best_ko,
  max(case when s.lang = 'en' and s.keys >= 60 and s.active_ms > 0 then round(s.keys * 60000.0 / s.active_ms) end)::int as best_en
from public.bm_profiles p
left join public.bm_sessions s on s.user_id = p.id
group by p.id;
grant select on public.bm_type_leaderboard to anon, authenticated;

-- 구경하기: 타자연습에서 지은 건축물만 공개
create view public.bm_public_worlds as
select id, nickname, coalesce(data -> 'type' ->> 'character', 'steve') as character, data -> 'type' -> 'worlds' as worlds, updated_at
from public.bm_profiles
where data -> 'type' ? 'worlds';
grant select on public.bm_public_worlds to anon, authenticated;

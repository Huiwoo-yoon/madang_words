-- 블록 마당 3D 블록 세상: 모두의 맵 (내가 만든 파쿠르·미로를 올리고 다른 사람이 하기)
-- Supabase SQL Editor에 통째로 붙여 넣고 Run (한 번만). schema.sql을 먼저 실행해 둔 상태여야 한다.
--  * 하기는 공짜. 남의 맵을 처음 깨면 50 에메랄드, 만든 사람은 누가 처음 깰 때마다 10 에메랄드(나중에 '받기'로)
--  * 맵은 한 사람당 10개까지, 만든 사람만 지울 수 있다

create table public.bm_maps (
  id bigint generated always as identity primary key,
  owner uuid not null references public.bm_profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 20),
  kind text not null check (kind in ('parkour', 'maze', 'free')),
  size text not null check (size ~ '^[0-9]{1,3},[0-9]{1,3},[0-9]{1,3}$'),
  data text not null check (length(data) < 200000),   -- 블록 배열 (base64)
  clears int not null default 0,                       -- 깬 사람 수
  best_ms int,                                         -- 가장 빠른 기록
  earned int not null default 0,                       -- 만든 사람이 아직 안 받은 에메랄드
  created_at timestamptz not null default now()
);
create table public.bm_map_clears (
  map_id bigint not null references public.bm_maps(id) on delete cascade,
  user_id uuid not null references public.bm_profiles(id) on delete cascade,
  ms int not null,
  created_at timestamptz not null default now(),
  primary key (map_id, user_id)
);

alter table public.bm_maps enable row level security;
alter table public.bm_map_clears enable row level security;
create policy "누구나 맵 보기" on public.bm_maps for select using (true);
create policy "내 맵 올리기" on public.bm_maps for insert with check (auth.uid() = owner);
create policy "내 맵 지우기" on public.bm_maps for delete using (auth.uid() = owner);
create policy "누구나 기록 보기" on public.bm_map_clears for select using (true);
-- 깬 기록·수익은 아래 함수로만 바뀐다 (직접 쓰기 정책 없음)

-- 새 맵은 기록 0으로 시작, 한 사람당 10개까지
create or replace function public.bm_map_guard() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.bm_maps where owner = new.owner) >= 10 then
    raise exception '맵은 10개까지 올릴 수 있어요. 예전 맵을 지우고 올려요.';
  end if;
  new.clears := 0;
  new.best_ms := null;
  new.earned := 0;
  new.created_at := now();
  return new;
end $$;
create trigger bm_map_guard before insert on public.bm_maps
for each row execute function public.bm_map_guard();

-- 맵 목록 (블록 데이터 없이 가볍게)과 맵별 기록 순위
create view public.bm_map_list as
select m.id, m.owner, p.nickname, m.title, m.kind, m.size, m.clears, m.best_ms, m.created_at
from public.bm_maps m join public.bm_profiles p on p.id = m.owner;
grant select on public.bm_map_list to anon, authenticated;
create view public.bm_map_ranking as
select c.map_id, p.nickname, c.ms
from public.bm_map_clears c join public.bm_profiles p on p.id = c.user_id;
grant select on public.bm_map_ranking to anon, authenticated;

-- 맵을 깼을 때: 기록을 남기고, 남의 맵을 처음 깼으면 보상 50을 알려 주고 만든 사람 몫 10을 쌓는다
create or replace function public.bm_clear_map(p_map bigint, p_ms int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_first boolean;
  v_reward int := 0;
begin
  if auth.uid() is null then raise exception '로그인이 필요해요'; end if;
  select owner into v_owner from bm_maps where id = p_map;
  if v_owner is null then raise exception '없는 맵이에요'; end if;
  if p_ms < 1000 then raise exception '기록이 이상해요'; end if;
  insert into bm_map_clears (map_id, user_id, ms) values (p_map, auth.uid(), p_ms)
  on conflict (map_id, user_id) do nothing;
  v_first := found;
  if not v_first then
    update bm_map_clears set ms = least(ms, p_ms) where map_id = p_map and user_id = auth.uid();
  end if;
  if v_first and auth.uid() <> v_owner then
    v_reward := 50;
  end if;
  update bm_maps set
    clears = clears + (case when v_first then 1 else 0 end),
    earned = earned + (case when v_reward > 0 then 10 else 0 end),
    best_ms = least(coalesce(best_ms, p_ms), p_ms)
  where id = p_map;
  return jsonb_build_object('first', v_first, 'reward', v_reward);
end $$;
grant execute on function public.bm_clear_map(bigint, int) to authenticated;

-- 만든 사람이 쌓인 수익을 받는다 (받은 만큼 돌려주고 0으로)
create or replace function public.bm_collect_map_earnings() returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if auth.uid() is null then raise exception '로그인이 필요해요'; end if;
  with taken as (
    update bm_maps m set earned = 0
    from (select id, earned from bm_maps where owner = auth.uid() and earned > 0 for update) old
    where m.id = old.id
    returning old.earned
  )
  select coalesce(sum(earned), 0) into v from taken;
  return v;
end $$;
grant execute on function public.bm_collect_map_earnings() to authenticated;

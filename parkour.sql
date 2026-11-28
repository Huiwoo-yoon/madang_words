-- 블록 마당 3D 블록 세상: 파쿠르 20단계 순위
-- Supabase SQL Editor에 통째로 붙여 넣고 Run (한 번만). schema.sql을 먼저 실행해 둔 상태여야 한다.
--  * 레벨마다 한 사람당 가장 좋은 기록 하나: 실패가 적을수록, 실패가 같으면 빠를수록 좋다
--  * 기록은 아래 함수로만 남긴다 (직접 쓰기 정책 없음)

create table public.bm_parkour (
  user_id uuid not null references public.bm_profiles(id) on delete cascade,
  level int not null check (level between 1 and 20),
  fails int not null check (fails between 0 and 9999),
  ms int not null check (ms >= 3000),
  runs int not null default 1,                 -- 몇 번 깼는지
  updated_at timestamptz not null default now(),
  primary key (user_id, level)
);
alter table public.bm_parkour enable row level security;
create policy "누구나 파쿠르 기록 보기" on public.bm_parkour for select using (true);

create view public.bm_parkour_ranking as
select r.level, r.user_id, p.nickname, r.fails, r.ms, r.runs, r.updated_at
from public.bm_parkour r join public.bm_profiles p on p.id = r.user_id;
grant select on public.bm_parkour_ranking to anon, authenticated;

-- 깼을 때 기록 남기기: 내 최고 기록보다 좋으면 바꾸고 true
create or replace function public.bm_parkour_record(p_level int, p_fails int, p_ms int) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_old bm_parkour;
begin
  if auth.uid() is null then raise exception '로그인이 필요해요'; end if;
  if p_level not between 1 and 20 or p_fails not between 0 and 9999 or p_ms < 3000 then raise exception '기록이 이상해요'; end if;
  select * into v_old from bm_parkour where user_id = auth.uid() and level = p_level for update;
  if not found then
    insert into bm_parkour (user_id, level, fails, ms) values (auth.uid(), p_level, p_fails, p_ms);
    return true;
  end if;
  if p_fails < v_old.fails or (p_fails = v_old.fails and p_ms < v_old.ms) then
    update bm_parkour set fails = p_fails, ms = p_ms, runs = runs + 1, updated_at = now()
    where user_id = auth.uid() and level = p_level;
    return true;
  end if;
  update bm_parkour set runs = runs + 1 where user_id = auth.uid() and level = p_level;
  return false;
end $$;
grant execute on function public.bm_parkour_record(int, int, int) to authenticated;

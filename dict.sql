-- 블록 마당 끝말잇기: 국어사전에서 찾아본 단어 모음 — Supabase SQL Editor에 붙여 넣고 Run (한 번만).
-- dict-check 함수만 쓸 수 있고(서비스 키), 게임은 읽기만 한다 (보스가 확인된 단어를 배운다).
create table public.bm_dict (
  word text primary key check (word ~ '^[가-힣]{2,20}$'),
  ok boolean not null,            -- true = 국어사전에 명사로 있음
  checked_at timestamptz not null default now()
);
alter table public.bm_dict enable row level security;
create policy "누구나 읽기" on public.bm_dict for select using (true);

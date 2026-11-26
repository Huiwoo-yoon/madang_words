# 블록 마당

전통놀이 마당(딱지치기·투호·미니게임), 블록 캐기 타자연습, 끝말잇기 대모험, 3D 블록 세상을 **아이디 하나**로 하는 통합 게임입니다.
원래 게임 폴더(`game/madang`, `game/type_v2`, `game/kkeutmal`)는 건드리지 않고 복사해서 만들었습니다.

## 같이 쓰는 것

| 무엇 | 어디에 저장 | 쓰는 놀이 |
|---|---|---|
| 💎 에메랄드 (지갑) | `bm_profiles.points` | 딱지치기·투호·미니게임의 "포인트", 끝말잇기의 "에메랄드" |
| 🧱 블록 가방 | `bm_profiles.data.inv` | 타자연습에서 캔 블록, 끝말잇기에서 받은 블록, 3D 블록 세상 |
| 마당 캐릭터 | `bm_profiles.character/chars` | 딱지치기·투호 |
| 놀이별 저장 | `bm_saves` (트로피·레벨·데이터) | 딱지치기·투호·미니게임·끝말잇기 (종합 순위) |
| 타자연습 저장·기록 | `bm_profiles.data.type`, `bm_sessions` | 타자연습 (순위·성장·구경) |
| 끝말잇기 저장 | `bm_profiles.data.kk` | 끝말잇기 (상점, 3D 내 세계, 파쿠르·미로 기록) |

## 파일

| 파일 | 내용 |
|---|---|
| `index.html`, `hub.js`, `hub.css` | 첫 화면 (로그인/가입, 놀이 고르기, 종합 순위, 예전 기록 가져오기) |
| `api.js` | 모든 놀이가 같이 쓰는 계정·지갑·저장 (Supabase `bm_` 표, 또는 config가 비었을 때 localStorage) |
| `config.js` | Supabase 주소와 공개 키 (타자연습·마당과 같은 프로젝트) |
| `schema.sql` | `bm_` 표 만들기 |
| `ttakji/`, `tuho/`, `sudoku/`, `wordcross/`, `scary/`, `mini.*`, `pixel.js` | 전통놀이 마당에서 그대로 복사 (`../api.js`만 새것) |
| `type/` | 타자연습 복사. `type/api.js`가 통합 계정으로 연결해 주는 어댑터 |
| `kkeutmal/` | 끝말잇기 + 3D 블록 세상 복사. `game.js`의 저장만 통합 계정으로 바꿈 |
| `server.js` | 이 컴퓨터에서 해 볼 때 쓰는 서버 (`--local` 테스트 모드에서는 국어사전 확인도 여기서) |
| `supabase/functions/dict-check/index.ts`, `dict.sql` | 온라인 국어사전 확인 함수와 찾은 단어 표 |

## 처음 한 번: 온라인 준비

1. Supabase(타자연습·마당과 같은 프로젝트) → SQL Editor에 `schema.sql`을 통째로 붙여 넣고 Run.
2. 끝말잇기 국어사전 확인:
   - SQL Editor에 `dict.sql`을 붙여 넣고 Run (찾은 단어를 쌓아 두는 `bm_dict` 표).
   - Edge Functions → Deploy a new function → Via Editor → 이름 `dict-check` → `supabase/functions/dict-check/index.ts` 내용을 통째로 붙여 넣고 Deploy.
   - 그 함수의 Details(설정)에서 **Verify JWT with legacy secret**(JWT 확인)을 끄고 Save. (게임의 공개 키로 부를 수 있게)
3. (Confirm email은 이미 꺼져 있어야 합니다. 타자연습·마당과 같은 설정)

## 이 컴퓨터에서 해 보기

```bash
node game/blockmadang/server.js
```
→ http://localhost:4480 (온라인 DB 사용)

```bash
node game/blockmadang/server.js --local
```
→ 온라인 DB 없이 이 브라우저에만 저장 (테스트용)

## 예전 기록 가져오기

첫 화면의 **📦 예전 기록 가져오기**에서 예전 아이디·비밀번호를 넣으면 (온라인 모드에서만):

- 타자연습: 블록 가방은 더해지고, 타자 진도·건축물·플레이 기록은 새 계정에서 타자연습을 아직 안 했으면 그대로 옮겨집니다.
- 전통놀이 마당: 포인트는 에메랄드에 더해지고, 캐릭터와 딱지치기·투호·미니게임 저장(트로피·레벨·아이템)이 옮겨집니다. 새 계정에서 이미 한 놀이는 그대로 둡니다.
- 같은 예전 계정은 한 번만 가져올 수 있습니다 (`bm_imports`). 예전 게임의 기록은 바뀌지 않습니다.

## 아직 안 된 것

- 에메랄드 1개 = 예전 마당 포인트 1개로 그대로 합쳤습니다. 끝말잇기에서 버는 양이 커서 딱지치기 상점 물건이 상대적으로 싸집니다.

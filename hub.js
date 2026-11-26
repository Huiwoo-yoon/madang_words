// ===== 블록 마당 (통합 시작 화면): 전통놀이 마당 + 타자연습 + 끝말잇기 + 3D 블록 세상 =====
// 놀이를 새로 추가할 때: 폴더를 만들고 여기에 한 줄 추가한다. id는 폴더 이름이자 DB의 game 값.
const GAMES = [
  { id: 'ttakji', emoji: '🟨', icon: 'ttakji', name: '딱지치기 왕', desc: '초록 구간에서 딱! 쳐서 상대 딱지를 뒤집어요.' },
  { id: 'tuho', emoji: '🏺', icon: 'pot', name: '투호 왕', desc: '화살을 던져 항아리에 쏙 넣어요.' },
  { id: 'kkeutmal', emoji: '🔤', name: '끝말잇기 대모험', desc: '보스 30명과 끝말잇기! 단어를 이을 때마다 블록을 받아요.' },
];
// 블록 놀이: 블록 가방을 같이 쓴다 (끝말잇기도 블록을 주지만, 트로피가 있어서 위 GAMES에 둔다)
const BLOCK_GAMES = [
  { href: 'type/index.html', emoji: '⌨️', name: '블록 캐기 타자연습', desc: '타자를 쳐서 블록을 캐요. 하루 30분!' },
  { href: 'kkeutmal/index.html#blocks', emoji: '🧱', name: '3D 블록 세상', desc: '모은 블록으로 3D 집 짓기, 파쿠르, 미로! (컴퓨터에서)' },
];
// 미니게임: 하루에 한 번만 보상을 받는다 (mini.js). 순위에는 들어가지 않는다
const MINIGAMES = [
  { id: 'sudoku', emoji: '🔢', name: '스도쿠', desc: '줄마다 숫자가 한 번씩! 어려운 판일수록 많이 받아요.', max: 2000 },
  { id: 'wordcross', emoji: '🔤', name: '워드크로스', desc: '힌트를 보고 가로세로 낱말을 채워요. 한글과 영어가 있어요.', max: 500 },
];
// 캐릭터 그림은 pixel.js에 있다 (능력과 이름은 각 놀이의 game.js)
const CHAR_IDS = ['kid', 'grandpa', 'ninja', 'boss', 'wizard', 'hero', 'robot', 'dragon', 'odysseus', 'cyclops', 'athena', 'medusa', 'poseidon', 'zeus'];

const $ = (id) => document.getElementById(id);
const charEmoji = (id) => Pixel.img(id, 2, true);
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

async function showHub(p) {
  $('login').classList.add('hidden');
  $('hChar').innerHTML = charEmoji(p.character);
  $('hName').textContent = p.nickname;
  $('hPoints').textContent = p.points.toLocaleString('ko-KR');
  $('hBlocks').textContent = Object.values((p.data && p.data.inv) || {}).reduce((a, b) => a + b, 0).toLocaleString('ko-KR');
  $('blockGames').innerHTML = BLOCK_GAMES.map((g) => `<a class="card game" href="${g.href}"><div class="emoji">${g.emoji}</div><b>${g.name}</b><p>${g.desc}</p></a>`).join('');
  renderGames([]);
  renderMinis();
  $('rankHead').innerHTML = `<tr><th>순위</th><th>캐릭터</th><th>닉네임</th><th>🏆 합계</th>${GAMES.map((g) => `<th>${g.emoji} ${g.name}</th>`).join('')}</tr>`;
  const cols = 4 + GAMES.length;
  $('rankBody').innerHTML = `<tr><td colspan="${cols}">불러오는 중…</td></tr>`;
  try {
    const rows = await API.leaderboard();
    renderGames(rows.filter((r) => r.id === API.myId()));
    renderRank(rows, cols);
  } catch (e) {
    $('rankBody').innerHTML = `<tr><td colspan="${cols}">순위를 불러오지 못했어요: ${escapeHtml(e.message)}</td></tr>`;
  }
}

// mine: 내 순위표 줄들 (아직 안 해 본 놀이는 줄이 없다)
function renderGames(mine) {
  $('games').innerHTML = GAMES.map((g) => {
    const s = mine.find((r) => r.game === g.id);
    return `<a class="card game" href="${g.id}/index.html">
      <div class="emoji">${g.icon ? Pixel.img(g.icon, 4) : g.emoji}</div><b>${g.name}</b><p>${g.desc}</p>
      <div class="mine">${s ? `🏆 ${s.trophies} · Lv ${s.level}` : '아직 안 해 봤어요'}</div></a>`;
  }).join('');
}

// 미니게임 카드: 오늘 했는지는 그 미니게임의 저장(data.day)을 보고 안다
async function renderMinis() {
  $('minis').innerHTML = MINIGAMES.map((g) => `<a class="card game mini" href="${g.id}/index.html">
    <div class="emoji">${g.emoji}</div><b>${g.name}</b><p>${g.desc}</p>
    <div class="mine" id="mini-${g.id}">…</div></a>`).join('');
  for (const g of MINIGAMES) {
    const row = await API.loadGame(g.id);
    $('mini-' + g.id).textContent = row.data.day === Mini.today() ? '✅ 오늘은 했어요. 내일 또!' : `🎁 오늘 도전 가능! 최대 +${g.max}`;
  }
}

function renderRank(rows, cols) {
  const users = {};
  rows.filter((r) => GAMES.some((g) => g.id === r.game)).forEach((r) => {
    const u = (users[r.id] ||= { ...r, total: 0, levels: 0, by: {} });
    u.total += r.trophies;
    u.levels += r.level;
    u.by[r.game] = r;
  });
  const list = Object.values(users).sort((a, b) => b.total - a.total || b.levels - a.levels);
  $('rankBody').innerHTML = list.map((u, i) =>
    `<tr class="${u.id === API.myId() ? 'me' : ''}"><td>${['🥇', '🥈', '🥉'][i] || i + 1}</td>
     <td>${charEmoji(u.character)}</td><td>${escapeHtml(u.nickname)}</td><td>${u.total}</td>
     ${GAMES.map((g) => `<td>${u.by[g.id] ? `🏆 ${u.by[g.id].trophies} · Lv ${u.by[g.id].level}` : '-'}</td>`).join('')}</tr>`).join('')
    || `<tr><td colspan="${cols}">아직 아무도 없어요.</td></tr>`;
}

// 맨 위 그림: 한옥 마당에 캐릭터들이 모여 있다
$('banner').style.backgroundImage = `url(${Pixel.scene('yard')})`;
$('banner').innerHTML = CHAR_IDS.map((id) => Pixel.img(id, 3)).join('');

// ===== 로그인 / 가입 =====
let authMode = 'login';

function setAuthMode(mode) {
  authMode = mode;
  $('authLoginTab').classList.toggle('sel', mode === 'login');
  $('authSignupTab').classList.toggle('sel', mode === 'signup');
  $('nickInput').classList.toggle('hidden', mode !== 'signup');
  $('authBtn').textContent = mode === 'login' ? '로그인' : '가입하고 시작!';
  $('pwInput').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  $('authErr').textContent = '';
}

function showLogin() {
  $('login').classList.remove('hidden');
  $('pwInput').value = '';
  $('authMode').textContent = API.online
    ? '🌐 온라인 모드: 어디서든 같은 아이디로 이어서 할 수 있어요.'
    : '💻 이 컴퓨터 전용 모드 (config.js가 비어 있음)';
  setAuthMode(authMode);
  $('idInput').focus();
}

async function submitAuth() {
  const id = $('idInput').value.trim().toLowerCase();
  const pw = $('pwInput').value;
  const nick = $('nickInput').value.trim();
  $('authErr').textContent = '';
  $('authBtn').disabled = true;
  try {
    showHub(authMode === 'login' ? await API.signIn(id, pw) : await API.signUp(id, pw, nick));
  } catch (e) {
    $('authErr').textContent = e.message;
  } finally {
    $('authBtn').disabled = false;
  }
}

$('authLoginTab').onclick = () => setAuthMode('login');
$('authSignupTab').onclick = () => setAuthMode('signup');
$('authBtn').onclick = submitAuth;
['idInput', 'pwInput', 'nickInput'].forEach((id) =>
  $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') submitAuth(); }));
$('logoutBtn').onclick = async () => {
  await API.signOut();
  showLogin();
};

API.restore()
  .then((p) => (p ? showHub(p) : showLogin()))
  .catch(() => showLogin());

// ===== 예전 기록 가져오기 (타자연습·전통놀이 마당 계정) =====
let impKind = 'type';
function setImpKind(k) {
  impKind = k;
  $('impType').classList.toggle('sel', k === 'type');
  $('impMadang').classList.toggle('sel', k === 'madang');
  $('impWhat').textContent = k === 'type'
    ? '가져오는 것: 블록 가방(블록 가방에 더해져요), 타자 진도·건축물·플레이 기록'
    : '가져오는 것: 포인트(에메랄드에 더해져요), 캐릭터, 딱지치기·투호 트로피·레벨·아이템';
  $('impErr').textContent = '';
}
$('importBtn').onclick = () => { setImpKind(impKind); $('impId').value = $('impPw').value = ''; $('importBox').classList.remove('hidden'); };
$('impClose').onclick = () => $('importBox').classList.add('hidden');
$('impType').onclick = () => setImpKind('type');
$('impMadang').onclick = () => setImpKind('madang');
$('impGo').onclick = async () => {
  $('impErr').textContent = '';
  $('impGo').disabled = true;
  try {
    const got = await API.importOld(impKind, $('impId').value.trim().toLowerCase(), $('impPw').value);
    alert(`📦 가져왔어요!${got.points ? `\n💎 에메랄드 +${got.points}` : ''}${got.blocks ? `\n🧱 블록 +${got.blocks}` : ''}${got.games.length ? `\n🎮 ${got.games.join(', ')}` : ''}`);
    location.reload();
  } catch (e) {
    $('impErr').textContent = e.message;
  } finally {
    $('impGo').disabled = false;
  }
};

// 놀이에서 '뒤로 가기'로 돌아오면 포인트가 예전 값일 수 있어서 새로 불러온다
window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });

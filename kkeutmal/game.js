// ===== 설정 =====
const MAX_LEVEL = 30;
const FINAL_BONUS = 100000;
const START_MONEY = 100; // 처음 시작할 때 받는 돈

// [도트 그림, 이름, 등장 대사] — 그림은 pixel.js의 모양 + 색
const boss = (shape, pal, name, line) => [Pix.img(shape, pal), name, line];
const BOSSES = [
  boss('slime', { a: '#3f9a2a', b: '#7fd85a', e: '#1f4a14', m: '#1f4a14' }, '꼬마 슬라임', '말랑말랑! 나 단어 열 개쯤 알아!'),
  boss('animal', { a: '#5a4a44', b: '#3a2e2a', h: '#3a2e2a', e: '#ff4040', x: '#2a1e1a', m: '#2a1e1a' }, '동굴 박쥐', '찍찍… 어두운 데서 단어 연습했지.'),
  boss('zombie', { a: '#5f9a4a', b: '#3d6a2e', h: '#3a2a1a', e: '#1a1a1a', m: '#2a3a1e' }, '좀비 농부', '으어어… 단어… 심어 놨지…'),
  boss('skeleton', { a: '#dcdcd0', b: '#a8a89a', e: '#1a1a1a', m: '#1a1a1a' }, '해골 궁수', '내 단어 화살을 피해 봐!'),
  boss('spider', { a: '#3a3030', b: '#5a4a4a', e: '#e02020', x: '#e02020' }, '독거미', '거미줄처럼 말을 엮어 주마.'),
  boss('animal', { a: '#c8c8c8', b: '#8a8a8a', h: '#9a9a9a', e: '#1a1a1a', x: '#1a1a1a', m: '#6a6a6a' }, '숲 늑대', '아우우~ 단어 냄새가 난다!'),
  boss('slime', { a: '#2a6ad0', b: '#6aa8ff', e: '#0a2a6a', m: '#0a2a6a' }, '물방울 슬라임', '퐁당퐁당, 단어의 바다로!'),
  boss('zombie', { a: '#4a8a6a', b: '#2a5a4a', h: '#ffd23f', e: '#1a1a1a', m: '#1a3a2a' }, '광산 좀비', '곡괭이 대신 단어를 캐 왔다…'),
  boss('skeleton', { a: '#cfefff', b: '#8ac0e0', e: '#1a3a6a', m: '#1a3a6a' }, '얼음 해골', '차가운 단어로 얼려 주지.'),
  boss('golem', { a: '#c8c8c8', b: '#8a8a8a', e: '#d03030', x: '#7a6a5a' }, '철 골렘', '쿵. 쿵. 단어. 검사.'),
  boss('spider', { a: '#1a2a4a', b: '#2a4a7a', e: '#40e0ff', x: '#40e0ff' }, '동굴 거미', '여덟 눈으로 네 말꼬리를 본다.'),
  boss('wizard', { a: '#8ac07a', b: '#5a3a2a', h: '#5a2a7a', x: '#3a1a4a', e: '#1a1a1a', m: '#3a1a1a' }, '늪 마녀', '히히, 단어 물약을 끓여 볼까?'),
  boss('zombie', { a: '#d8c08a', b: '#b89a6a', h: '#e8e0c8', e: '#1a1a1a', m: '#6a5a3a' }, '사막 미라', '붕대 속에 단어를 숨겨 왔다.'),
  boss('slime', { a: '#a02a10', b: '#ff7a2a', e: '#ffd23f', m: '#3a0a0a' }, '마그마 슬라임', '뜨거운 단어 맛 좀 봐라!'),
  boss('ghost', { a: '#e8f0ff', e: '#3a3a6a', m: '#3a3a6a' }, '유령 광부', '우우~ 이 광산의 단어는 내 거야~'),
  boss('ninja', { a: '#ffd2a6', b: '#1a1a24', e: '#ff3a3a', x: '#ff3a3a' }, '그림자 닌자', '소리 없이 단어를 던진다.'),
  boss('robot', { a: '#d0803a', b: '#8a4a1a', x: '#6a3a10', e: '#40ffb0', m: '#3a1a0a' }, '구리 로봇', '삐빅. 단어 검색 시작.'),
  boss('dragon', { a: '#2a8a8a', b: '#5ac0b0', h: '#1a5a5a', e: '#ffff60', x: '#ffffff' }, '바다 괴물', '깊은 바다에서 올라왔다!'),
  boss('skeleton', { a: '#5a5a5a', b: '#3a3a3a', e: '#ff4040', m: '#ff4040' }, '해골 기사', '검은 갑옷의 단어 기사다.'),
  boss('golem', { a: '#8a2a1a', b: '#ff7a1a', e: '#ffd23f', x: '#3a0a0a' }, '용암 골렘', '녹아내리는 단어를 받아라!'),
  boss('wizard', { a: '#ffd2a6', b: '#e8e8e8', h: '#2a3ad0', x: '#ffd23f', e: '#1a1a1a', m: '#6a3a2a' }, '번개 마법사', '번쩍! 번개처럼 잇는다!'),
  boss('ghost', { a: '#ff9a2a', e: '#7a1a00', m: '#7a1a00' }, '불꽃 정령', '활활! 단어를 태워 버리겠다!'),
  boss('golem', { a: '#5ee0e0', b: '#2a9a9a', e: '#0a3a3a', x: '#ffffff' }, '다이아 골렘', '나는 세상에서 가장 단단하다.'),
  boss('wizard', { a: '#9ae07a', b: '#3a5a2a', h: '#2a6a1a', x: '#a0ff40', e: '#ff3a3a', m: '#1a2a0a' }, '독 마녀', '독 단어 한 방울이면 끝이야.'),
  boss('spider', { a: '#3a1a4a', b: '#6a2a8a', e: '#ff40ff', x: '#ffd23f' }, '어둠 거미 여왕', '내 거미줄에서 빠져나갈 수 없다.'),
  boss('dragon', { a: '#bfe8ff', b: '#6ab0e0', h: '#3a7ab0', e: '#1a3a8a', x: '#ffffff' }, '얼음 드래곤', '얼어붙은 끝말을 받아라!'),
  boss('demon', { a: '#c02a2a', b: '#6a0a0a', h: '#2a2a2a', e: '#ffd23f', m: '#2a0a0a', x: '#ffffff' }, '지하 악마', '용암 아래에서 기다리고 있었다.'),
  boss('ninja', { a: '#b06cff', b: '#1a0a2a', e: '#e080ff', x: '#e080ff' }, '흑요석 기사', '보라빛 갑옷은 뚫을 수 없다.'),
  boss('demon', { a: '#2a1a3a', b: '#120a1a', h: '#b06cff', e: '#e080ff', m: '#b06cff', x: '#ffffff' }, '공허의 마왕', '여기까지 오다니… 하지만 끝이다.'),
  boss('king', { a: '#ffd2a6', b: '#6a3a1a', h: '#ffcf3f', x: '#ff3a5a', e: '#1a1a1a', m: '#8a2a2a' }, '세태원', '내가 바로 최종 보스 세태원이다. 각오해!'),
];

// 레벨이 오를수록 시간은 줄고, 보스는 단어를 더 많이 알고, 덜 실수하고, 더 얄밉게 고른다
function bossStats(lv) {
  const t = (lv - 1) / (MAX_LEVEL - 1);
  return {
    time: Math.round(20 - 13 * t),             // 내 차례 시간(초): 20 → 7
    vocab: 0.5 + 0.5 * t,                      // 아는 단어 비율: 50% → 100%
    miss: 0.2 * Math.pow(1 - t, 1.5) + 0.01,   // 차례마다 생각 안 날 확률: 21% → 1%
    smart: 0.1 + 0.9 * t,                      // 이어가기 힘든 단어를 고를 확률: 10% → 100%
    reward: lv * lv * 100,                     // 이기면 에메랄드: 100, 400, 900 … 90,000
    fee: lv * 10,                              // 참가비: 10 … 300
  };
}
// 돈이 참가비보다 적으면 레벨 1만 공짜로 할 수 있다 (돈이 없어서 영영 못 하는 일이 없도록)
function entryFee(lv) {
  if (myChar().freeFee) return 0;
  const fee = bossStats(lv).fee;
  return lv === 1 && S.money < fee ? 0 : fee;
}

// ===== 단어 사전 =====
const DICT = new Set(WORDS.filter((w) => /^[가-힣]{2,}$/.test(w)));
const BY_FIRST = new Map();
function addWord(w) {
  DICT.add(w);
  if (!BY_FIRST.has(w[0])) BY_FIRST.set(w[0], []);
  if (!BY_FIRST.get(w[0]).includes(w)) BY_FIRST.get(w[0]).push(w);
}
[...DICT].forEach(addWord);
const LEARNED = new Set(); // 사전에서 확인된, 목록 밖 단어 (모든 보스가 안다)

// 두음법칙: 력→역, 리→이, 로→노, 녀→여 …
const Y_VOWELS = [2, 6, 7, 12, 17, 20]; // ㅑ ㅕ ㅖ ㅛ ㅠ ㅣ
function dueum(ch) {
  const c = ch.charCodeAt(0) - 0xac00;
  if (c < 0 || c > 11171) return null;
  const cho = Math.floor(c / 588), jung = Math.floor((c % 588) / 28), jong = c % 28;
  let n = null;
  if (cho === 5) n = Y_VOWELS.includes(jung) ? 11 : 2; // ㄹ → ㅇ / ㄴ
  else if (cho === 2 && Y_VOWELS.includes(jung)) n = 11; // ㄴ → ㅇ
  return n === null ? null : String.fromCharCode(0xac00 + (n * 21 + jung) * 28 + jong);
}
const lastOf = (w) => w[w.length - 1];
const startsFor = (ch) => { const d = dueum(ch); return d ? [ch, d] : [ch]; };
function nexts(ch, used) {
  const out = [];
  for (const s of startsFor(ch)) for (const w of BY_FIRST.get(s) || []) if (!used.has(w)) out.push(w);
  return out;
}
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}
const bossKnows = (w, lv) => LEARNED.has(w) || hash(w + '#' + lv) < bossStats(lv).vocab;

// ===== 저장 =====
// 블록 마당 통합 계정에 저장한다 (../api.js)
//   에메랄드 = profile.points (모든 놀이 공용), 블록 가방 = profile.data.inv (타자연습과 공용), 나머지 = profile.data.kk
let P = null; // 통합 프로필
let S = null; // 끝말잇기 상태 (S.money, S.inv는 위의 공용 값을 그대로 비춘다)
function loadState(p) {
  P = p;
  P.data = P.data || {};
  const first = !P.data.kk;
  S = Object.assign({ trophies: 0, level: 1, best: 1, inMatch: false, alba: 0, chars: ['me'], char: 'me' }, P.data.kk || {});
  S.money = P.points + (first ? START_MONEY : 0);
  S.inv = P.data.inv || {};
  if (first) for (const [id, n] of Object.entries({ grass: 20, dirt: 20, log: 10, planks: 10, glass: 4 })) S.inv[id] = (S.inv[id] || 0) + n; // 처음 선물
  S.potions = Object.assign({ time: 0, hint: 0, shield: 0 }, S.potions);
  S.up = Object.assign({ clock: 0, wallet: 0, brain: 0 }, S.up);
  S.cleared = S.cleared || {}; // 깬 파쿠르·미로 ('p1', 'm2' …)
  S.times = S.times || {};     // 파쿠르·미로 최고 기록(ms)
  if (S.inMatch) { S.inMatch = false; S.level = 1; } // 게임 중에 나가면 진 것으로 친다
  saveNow(); // 처음 선물·나간 판 처리를 바로 남긴다
}
// 알바가 1초마다 돈을 벌어서 자주 불리므로, 1.5초에 한 번만 보낸다
let saveTimer = null, ranked = null;
function save() { if (!saveTimer) saveTimer = setTimeout(saveNow, 1500); }
function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!P) return;
  const { money, inv, ...kk } = S;
  P.points = money;
  P.data.inv = inv;
  P.data.kk = kk;
  API.saveProfile(P).catch((e) => console.warn('저장 실패', e));
  // 종합 순위에는 트로피와 최고 레벨만 올린다
  const r = S.trophies + ':' + S.best;
  if (r !== ranked) {
    ranked = r;
    API.save('kkeutmal', { points: P.points, character: P.character, chars: P.chars, trophies: S.trophies, level: S.best, data: {} })
      .catch((e) => console.warn('순위 저장 실패', e));
  }
}
window.addEventListener('pagehide', saveNow);

const myChar = () => CHARACTERS.find((c) => c.id === S.char) || CHARACTERS[0];
// 보스 능력에 내 업그레이드·캐릭터 능력을 더한 실제 한 판 조건
function matchStats(lv) {
  const st = bossStats(lv), c = myChar();
  return {
    ...st,
    time: st.time + S.up.clock + (c.time || 0),
    miss: st.miss + S.up.brain * 0.02 + (c.miss || 0),
    reward: Math.round(st.reward * (1 + S.up.wallet * 0.1 + (c.reward || 0))),
  };
}

// ===== 화면 =====
const $ = (id) => document.getElementById(id);
const won = (n) => n.toLocaleString('ko-KR') + ' 에메랄드';
function show(id) {
  document.querySelectorAll('.screen').forEach((el) => el.classList.toggle('hidden', el.id !== id));
}
function renderTop() {
  $('money').innerHTML = ICON.gem + ' ' + S.money.toLocaleString('ko-KR');
  $('trophy').innerHTML = ICON.trophy + ' ' + S.trophies;
  $('albaChip').classList.toggle('hidden', !S.alba);
  $('albaChip').innerHTML = `${ICON.miner} +${S.alba}/초`;
}
// 5레벨마다 바뀌는 배경
let bgShown = null;
function setBackground(lv) {
  const bg = bgFor(lv);
  if (bg === bgShown) return;
  bgShown = bg;
  document.body.style.backgroundImage = `url(${Pix.background(bg.i)})`;
}
function renderHome() {
  renderTop();
  setBackground(S.level);
  const [emoji, name, line] = BOSSES[S.level - 1];
  const st = matchStats(S.level);
  const c = myChar();
  $('meChip').innerHTML = `${c.emoji} ${c.name}`;
  $('bgName').textContent = `바이옴: ${bgFor(S.level).name}`;
  const fee = entryFee(S.level);
  $('startBtn').textContent = fee ? `도전! (참가비 ${won(fee)})`
    : myChar().freeFee ? `도전! (${myChar().name} 덕분에 공짜)` : '도전! (에메랄드가 모자라서 이번엔 공짜)';
  $('nextBoss').innerHTML = `
    <div class="emoji">${emoji}</div>
    <div class="lv">${S.level === MAX_LEVEL ? '최종 보스' : `레벨 ${S.level}`}</div>
    <div class="name">${name}</div>
    <div class="line">“${line}”</div>
    <div class="info">⏱ ${st.time}초 · 이기면 ${ICON.gem} ${won(st.reward)}${S.level === MAX_LEVEL ? ` + ${ICON.trophy} + ${won(FINAL_BONUS)}` : ''}</div>`;
  $('nextBoss').classList.toggle('final', S.level === MAX_LEVEL);
  $('ladder').innerHTML = BOSSES.map(([e, n], i) => {
    const lv = i + 1;
    const cls = lv < S.level ? 'done' : lv === S.level ? 'now' : 'locked';
    return `<div class="step ${cls}${lv === MAX_LEVEL ? ' final' : ''}" title="${lv}. ${n}"><span>${lv < S.level ? '✔' : e}</span><small>${lv}</small></div>`;
  }).join('');
  $('bestText').textContent = `최고 기록: 레벨 ${S.best}`;
  show('home');
}

// ===== 한 판 =====
let M = null;

function startMatch() {
  const lv = S.level;
  S.money -= entryFee(lv);
  renderTop();
  M = { lv, st: matchStats(lv), used: new Set(), last: null, turn: 'boss', over: false, timer: null, deadline: 0, blocks: [] };
  S.inMatch = true; save();
  setBackground(lv);
  renderPotionBar();
  const [emoji, name, line] = BOSSES[lv - 1];
  $('bossMini').innerHTML = `<span class="emoji">${emoji}</span><div><div class="lv">${lv === MAX_LEVEL ? '최종 보스' : `레벨 ${lv}`}</div><div class="name">${name}</div></div>`;
  $('battle').classList.toggle('final', lv === MAX_LEVEL);
  $('chain').innerHTML = '';
  $('msg').textContent = '';
  $('input').value = '';
  setTimer(1);
  $('timerText').textContent = '';
  say('boss', line, true);
  show('battle');
  bossTurn();
}

function say(who, text, isTalk) {
  const el = document.createElement('div');
  el.className = `bubble ${who}${isTalk ? ' talk' : ''}`;
  if (isTalk) el.textContent = text;
  else el.innerHTML = `${text.slice(0, -1)}<b>${text.slice(-1)}</b>${who === 'me' ? `<span class="av">${myChar().emoji}</span>` : ''}`;
  $('chain').appendChild(el);
  $('chain').scrollTop = $('chain').scrollHeight;
  return el;
}

function bossTurn() {
  M.turn = 'boss';
  $('input').disabled = true;
  $('prompt').textContent = '';
  const thinking = say('boss', '생각 중…', true);
  thinking.classList.add('thinking');
  setTimeout(() => {
    thinking.remove();
    if (M.over) return;
    const w = bossPick();
    if (!w) return endMatch(true, M.last ? `‘${lastOf(M.last)}’(으)로 시작하는 단어가 생각 안 나…` : '');
    play('boss', w);
    playerTurn();
  }, 700 + Math.random() * 900);
}

// 보스가 단어 고르기: 아는 단어 중에서, 내가 이어받을 수 있는 단어만 쓴다
function bossPick() {
  const { lv, st, used } = M;
  if (!M.last) { // 첫 단어: 이어가기 쉬운 단어
    const pool = [...DICT].filter((w) => bossKnows(w, lv) && nexts(lastOf(w), used).length >= 5);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  if (Math.random() < st.miss) return null;
  const options = nexts(lastOf(M.last), used)
    .filter((w) => bossKnows(w, lv))
    .map((w) => ({ w, left: nexts(lastOf(w), new Set([...used, w])).length }))
    .filter((o) => o.left > 0);
  if (!options.length) return null;
  if (Math.random() < st.smart) { // 얄밉게: 이어갈 단어가 가장 적은 것
    options.sort((a, b) => a.left - b.left);
    return options[Math.floor(Math.random() * Math.min(3, options.length))].w;
  }
  return options[Math.floor(Math.random() * options.length)].w;
}

function play(who, w) {
  M.used.add(w);
  M.last = w;
  say(who, w);
}

function playerTurn() {
  M.turn = 'player';
  const ch = lastOf(M.last);
  const alt = dueum(ch);
  $('prompt').innerHTML = `<b>${ch}</b>${alt ? ` 또는 <b>${alt}</b>` : ''}(으)로 시작하는 단어!`;
  $('msg').textContent = '';
  $('input').disabled = false;
  $('input').value = '';
  $('input').focus();
  M.deadline = Date.now() + M.st.time * 1000;
  clearInterval(M.timer);
  M.timer = setInterval(tick, 100);
  tick();
}

function setTimer(frac) {
  $('timerBar').style.width = frac * 100 + '%';
  $('timerBar').classList.toggle('low', frac < 0.3);
}
function tick() {
  const left = Math.max(0, M.deadline - Date.now());
  setTimer(Math.min(1, left / (M.st.time * 1000)));
  $('timerText').textContent = Math.ceil(left / 1000) + '초';
  if (left <= 0 && M.turn === 'player') endMatch(false, '시간 초과!');
}

let checking = false;
async function submitWord() {
  if (!M || M.over || M.turn !== 'player' || checking) return;
  const w = $('input').value.replace(/\s/g, '');
  const ch = lastOf(M.last);
  const fail = (t) => { // 틀리면 바로 진다 (보호 물약이 있으면 한 번 봐준다)
    if (S.potions.shield > 0) {
      S.potions.shield--; save(); renderPotionBar();
      $('msg').textContent = `🛡️ 보호 물약이 막아 줬어요! (${t}) 다시 써 보세요.`;
      $('input').select();
      return;
    }
    endMatch(false, `‘${w}’ — ${t}`);
  };
  if (!w) return;
  if (!/^[가-힣]+$/.test(w)) return fail('한글 낱말만 쓸 수 있어요.');
  if (w.length < 2) return fail('두 글자 이상이어야 해요.');
  if (!startsFor(ch).includes(w[0])) return fail(`‘${startsFor(ch).join('’ 또는 ‘')}’(으)로 시작해야 해요.`);
  if (M.used.has(w)) return fail('이미 나온 단어예요.');
  if (!DICT.has(w)) {
    checking = true;
    $('msg').textContent = '📖 국어사전에서 찾는 중…';
    const res = await API.dictCheck(w); // 온라인: Supabase 함수, 이 컴퓨터 전용: server.js
    checking = false;
    if (M.over) return;
    if (res.error) { $('msg').textContent = res.error; return; } // 연결 문제는 내 잘못이 아니니 지지 않는다
    if (!res.ok) return fail('국어사전에 명사로 없어요.');
    LEARNED.add(w);
    addWord(w);
  }
  clearInterval(M.timer);
  play('me', w);
  // 단어마다 블록 1개: 글자가 길수록 귀한 블록 (2글자 잔디·흙… 5글자 이상 다이아·에메랄드…)
  const b = gainBlock(Math.min(4, w.length - 1));
  $('msg').innerHTML = `${Blocks.icon(b)} ${b.name} 블록 +1`;
  bossTurn();
}
function gainBlock(tier) {
  const b = Blocks.randomOfTier(Math.max(1, tier));
  S.inv[b.id] = (S.inv[b.id] || 0) + 1;
  M.blocks.push(b);
  return b;
}

function endMatch(win, reason) {
  M.over = true;
  clearInterval(M.timer);
  $('input').disabled = true;
  S.inMatch = false;
  const lv = M.lv;
  const [emoji, name] = BOSSES[lv - 1];
  let html;
  if (win) {
    const reward = M.st.reward;
    S.money += reward;
    for (let i = 0; i < 1 + Math.floor(lv / 3); i++) gainBlock(1 + Math.floor(Math.random() * Math.min(4, 1 + Math.floor(lv / 8)))); // 이긴 선물 블록
    if (reason) say('boss', reason, true);
    if (lv === MAX_LEVEL) {
      S.money += FINAL_BONUS;
      S.trophies += 1;
      S.level = 1;
      html = `<div class="big">${ICON.trophy}</div><h2>세태원을 이겼다!</h2>
        <p>“말도 안 돼… 네가 진짜 끝말잇기 왕이구나.”</p>
        <p class="gain">${ICON.gem} +${won(reward + FINAL_BONUS)} · ${ICON.trophy} 트로피 +1</p>
        <p class="sub">이제 트로피 ${S.trophies}개! 다시 레벨 1부터 도전할 수 있어요.</p>
        <button class="btn primary" data-act="home">처음 화면으로</button>`;
    } else {
      S.level = lv + 1;
      html = `<div class="big">🎉</div><h2>${name}을(를) 이겼다!</h2>
        <p class="gain">${ICON.gem} +${won(reward)}</p>
        <p class="sub">다음 상대: ${BOSSES[lv][0]} ${BOSSES[lv][1]}</p>
        <button class="btn primary" data-act="next">다음 보스 도전 (참가비 ${won(entryFee(S.level))})</button>
        <button class="btn ghost" data-act="home">처음 화면</button>`;
    }
    S.best = Math.max(S.best, Math.min(lv + 1, MAX_LEVEL));
  } else {
    S.level = 1;
    const hints = M.turn === 'player' ? nexts(lastOf(M.last), M.used).sort(() => Math.random() - 0.5).slice(0, 4) : [];
    html = `<div class="big">${emoji}</div><h2>${reason}</h2>
      <p>${name}에게 졌어요… 레벨 1부터 다시 시작해요.</p>
      ${hints.length ? `<p class="sub">이런 단어가 있었어요: ${hints.join(', ')}</p>` : ''}
      <button class="btn primary" data-act="next">다시 도전 (참가비 ${won(entryFee(S.level))})</button>
      <button class="btn ghost" data-act="home">처음 화면</button>`;
  }
  if (M.blocks.length) html = html.replace('<button', `<p class="sub">이번 판에 모은 블록: ${M.blocks.map((b) => Blocks.icon(b)).join(' ')}</p><button`);
  save();
  renderTop();
  $('modal').innerHTML = html;
  setTimeout(() => $('overlay').classList.remove('hidden'), win ? 600 : 200);
}

// ===== 포션 쓰기 (게임 중) =====
function renderPotionBar() {
  $('potionBar').innerHTML = POTIONS.map((p) => `
    <button class="potion" data-potion="${p.id}" ${p.id === 'shield' || !S.potions[p.id] ? 'disabled' : ''}
      title="${p.desc}">${p.emoji} ${p.name} <b>${S.potions[p.id]}</b></button>`).join('');
}
function usePotion(id) {
  if (!M || M.over || M.turn !== 'player' || !S.potions[id]) return;
  S.potions[id]--;
  if (id === 'time') {
    M.deadline += 7000;
    $('msg').textContent = '⏳ 시간이 7초 늘었어요!';
  } else if (id === 'hint') {
    const ws = nexts(lastOf(M.last), M.used);
    $('msg').textContent = `💡 힌트: ‘${ws[Math.floor(Math.random() * ws.length)]}’`;
  }
  save();
  renderPotionBar();
  $('input').focus();
}

// ===== 상점 =====
let shopTab = 'potion';
function buy(cost, apply, done) {
  if (S.money < cost) { $('shopMsg').textContent = `${won(cost - S.money)}가 모자라요.`; return; }
  S.money -= cost;
  apply();
  save();
  renderTop();
  renderShop();
  $('shopMsg').innerHTML = done;
}
function shopItem(emoji, name, desc, btnText, act, disabled) {
  return `<div class="item"><div class="ie">${emoji}</div><div class="it"><b>${name}</b><span>${desc}</span></div>
    <button class="btn ${disabled ? 'ghost' : 'primary'} small" data-buy="${act}" ${disabled ? 'disabled' : ''}>${btnText}</button></div>`;
}
function renderShop() {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === shopTab));
  let html = '';
  if (shopTab === 'potion') {
    html = POTIONS.map((p) => shopItem(p.emoji, `${p.name} (가진 것 ${S.potions[p.id]}개)`, p.desc, won(p.cost), 'potion:' + p.id)).join('');
  } else if (shopTab === 'upgrade') {
    html = UPGRADES.map((u) => {
      const n = S.up[u.id];
      const maxed = n >= u.max;
      const desc = `${n}/${u.max}단계 · 지금: ${n ? u.desc(n) : '없음'}${maxed ? '' : ` → 다음: ${u.desc(n + 1)}`}`;
      return shopItem(u.emoji, u.name, desc, maxed ? '최대' : won(upgradeCost(u, n)), 'up:' + u.id, maxed);
    }).join('');
  } else if (shopTab === 'alba') {
    const n = S.alba, maxed = n >= ALBA_MAX;
    const desc = n
      ? `레벨 ${n} · 1초에 ${won(n)}씩 벌어 와요 (게임이 켜져 있는 동안).${maxed ? '' : ` 다음 레벨: 1초에 ${won(n + 1)}`}`
      : '고용하면 게임이 켜져 있는 동안 1초에 에메랄드 1개씩 캐 와요. 레벨을 올리면 더 많이 캐요.';
    html = shopItem(ICON.miner, n ? '광부 알바' : '광부 알바 고용', desc, maxed ? '최대' : won(albaCost(n)), 'alba', maxed);
  } else if (shopTab === 'block') {
    html = Blocks.LIST.filter((b) => b.tier >= 0).map((b) => `<div class="item"><div class="ie">${Blocks.icon(b)}</div>
      <div class="it"><b>${b.name}</b><span>가진 것 ${S.inv[b.id] || 0}개 · 1개 ${won(b.price)}</span></div>
      <button class="btn primary small" data-buy="blk:${b.id}:1">1개</button>
      <button class="btn primary small" data-buy="blk:${b.id}:10">10개</button></div>`).join('');
  } else {
    html = CHARACTERS.map((c) => {
      const owned = S.chars.includes(c.id);
      const on = S.char === c.id;
      return shopItem(c.emoji, c.name, c.desc, on ? '함께하는 중' : owned ? '고르기' : won(c.cost), 'char:' + c.id, on);
    }).join('');
  }
  $('shopList').innerHTML = html;
}
function onBuy(act) {
  const [kind, id, count] = act.split(':');
  if (kind === 'blk') {
    const b = Blocks.BY_ID[id], n = +count;
    buy(b.price * n, () => { S.inv[id] = (S.inv[id] || 0) + n; }, `${Blocks.icon(b)} ${b.name} ${n}개를 샀어요!`);
  } else if (kind === 'potion') {
    const p = POTIONS.find((x) => x.id === id);
    buy(p.cost, () => S.potions[id]++, `${p.emoji} ${p.name}을(를) 샀어요!`);
  } else if (kind === 'up') {
    const u = UPGRADES.find((x) => x.id === id);
    buy(upgradeCost(u, S.up[id]), () => S.up[id]++, `${u.emoji} ${u.name} ${S.up[id] + 1}단계!`);
  } else if (kind === 'alba') {
    buy(albaCost(S.alba), () => S.alba++, S.alba ? `${ICON.miner} 알바 레벨 ${S.alba + 1}!` : `${ICON.miner} 광부 알바를 고용했어요!`);
  } else if (kind === 'char') {
    const c = CHARACTERS.find((x) => x.id === id);
    if (S.chars.includes(id)) { S.char = id; save(); renderShop(); $('shopMsg').innerHTML = `${c.emoji} ${c.name}와(과) 함께해요!`; return; }
    buy(c.cost, () => { S.chars.push(id); S.char = id; }, `${c.emoji} ${c.name}을(를) 데려왔어요!`);
  }
}

// ===== 알바: 1초마다 돈 벌기 =====
setInterval(() => {
  if (!S || !S.alba) return;
  S.money += S.alba;
  save();
  renderTop();
}, 1000);

// ===== 버튼 =====
$('startBtn').onclick = startMatch;
$('shopBtn').onclick = () => { $('shopMsg').textContent = ''; renderShop(); show('shop'); };
$('shopBack').onclick = renderHome;
$('shopTabs').onclick = (e) => { if (e.target.dataset.tab) { shopTab = e.target.dataset.tab; $('shopMsg').textContent = ''; renderShop(); } };
$('shopList').onclick = (e) => { const b = e.target.closest('[data-buy]'); if (b && !b.disabled) onBuy(b.dataset.buy); };
$('potionBar').onclick = (e) => { const b = e.target.closest('[data-potion]'); if (b) usePotion(b.dataset.potion); };
$('giveUp').onclick = () => { if (M && !M.over && confirm('포기하면 레벨 1부터 다시 해요. 포기할까요?')) endMatch(false, '포기했어요'); };
$('form').onsubmit = (e) => { e.preventDefault(); submitWord(); };
$('input').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  if (e.isComposing || e.keyCode === 229) return; // 한글 조합 중 Enter는 무시 (두 번 입력 방지)
  submitWord();
});
$('modal').onclick = (e) => {
  const act = e.target.dataset.act;
  if (!act) return;
  $('overlay').classList.add('hidden');
  if (act === 'next') startMatch();
  else if (act === 'again') startArcade(A.game.id, A.lv); // 미니게임 (arcade.js)
  else if (act === 'arcade') showArcade();
  else if (act === 'blocks') BlockWorld.render(); // 블록 세상 (blockworld.js)
  else if (act === 'bwAgain') BlockWorld.again();
  else renderHome();
};

API.dictLearned().then((ws) => ws.forEach((w) => { LEARNED.add(w); addWord(w); })).catch(() => {});
// 시작 (모든 스크립트를 읽은 뒤): 블록 마당에 로그인되어 있지 않으면 첫 화면(로그인)으로 보낸다
window.addEventListener('DOMContentLoaded', async () => {
  const p = await API.restore().catch(() => null);
  if (!p) { location.href = '../index.html'; return; }
  await API.loadGame('kkeutmal').catch(() => {}); // 종합 순위 줄 만들기
  loadState(p);
  renderHome();
  if (location.hash === '#blocks') BlockWorld.render(); // 첫 화면의 '3D 블록 세상'에서 바로 왔을 때
});

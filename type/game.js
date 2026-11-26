// ===== 한글 → 자판 키 변환 (두벌식) =====
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const SPLIT = {
  'ㅘ': 'ㅗㅏ', 'ㅙ': 'ㅗㅐ', 'ㅚ': 'ㅗㅣ', 'ㅝ': 'ㅜㅓ', 'ㅞ': 'ㅜㅔ', 'ㅟ': 'ㅜㅣ', 'ㅢ': 'ㅡㅣ',
  'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ', 'ㄽ': 'ㄹㅅ',
  'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ',
};
// '^'가 붙으면 Shift를 누른 채로 치는 키
const JAMO_KEY = {
  'ㄱ': 'r', 'ㄲ': '^r', 'ㄴ': 's', 'ㄷ': 'e', 'ㄸ': '^e', 'ㄹ': 'f', 'ㅁ': 'a', 'ㅂ': 'q', 'ㅃ': '^q',
  'ㅅ': 't', 'ㅆ': '^t', 'ㅇ': 'd', 'ㅈ': 'w', 'ㅉ': '^w', 'ㅊ': 'c', 'ㅋ': 'z', 'ㅌ': 'x', 'ㅍ': 'v',
  'ㅎ': 'g', 'ㅏ': 'k', 'ㅐ': 'o', 'ㅑ': 'i', 'ㅒ': '^o', 'ㅓ': 'j', 'ㅔ': 'p', 'ㅕ': 'u', 'ㅖ': '^p',
  'ㅗ': 'h', 'ㅛ': 'y', 'ㅜ': 'n', 'ㅠ': 'b', 'ㅡ': 'm', 'ㅣ': 'l',
};
const SHIFT_SYM = { '!': '^1', '?': '^/' };

function jamoKeys(j) {
  if (SPLIT[j]) return [...SPLIT[j]].map(x => JAMO_KEY[x]);
  return JAMO_KEY[j] ? [JAMO_KEY[j]] : [j];
}
function charKeys(ch) {
  const code = ch.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const n = code - 0xAC00;
    return [
      ...jamoKeys(CHO[Math.floor(n / 588)]),
      ...jamoKeys(JUNG[Math.floor((n % 588) / 28)]),
      ...(n % 28 ? jamoKeys(JONG[n % 28]) : []),
    ];
  }
  if (ch === ' ') return ['space'];
  if (/[A-Z]/.test(ch)) return ['^' + ch.toLowerCase()];
  if (SHIFT_SYM[ch]) return [SHIFT_SYM[ch]];
  return jamoKeys(ch); // 영문 소문자, 숫자, 낱자 자모, 문장부호
}
const toKeys = s => [...s].flatMap(charKeys);

// ===== 효과음 (Web Audio로 직접 합성, 파일 없음) =====
let soundOn = true;
try { soundOn = localStorage.getItem('typeMineSound') !== 'off'; } catch (e) {}
let actx = null;
function ac() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, dur, type = 'square', vol = 0.08, when = 0, slideTo) {
  if (!soundOn) return;
  const a = ac(), t = a.currentTime + when;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur);
}
function noise(dur, filterType, freq, vol = 0.2, when = 0) {
  if (!soundOn) return;
  const a = ac(), t = a.currentTime + when;
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; f.type = filterType; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}
const sfx = {
  key: p => { tone(500 + p * 500, 0.05, 'square', 0.05); noise(0.03, 'lowpass', 900, 0.12); },
  error: () => { noise(0.45, 'highpass', 2500, 0.15); tone(140, 0.25, 'sawtooth', 0.06, 0, 70); }, // 크리퍼 "쉬익"
  break: () => { noise(0.25, 'lowpass', 600, 0.35); tone(900 + Math.random() * 700, 0.12, 'triangle', 0.12, 0.12, 1800); },
  place: () => { noise(0.08, 'lowpass', 400, 0.3); tone(180, 0.06, 'square', 0.05); },
  build: () => [392, 523, 659, 784].forEach((f, i) => { noise(0.06, 'lowpass', 500, 0.25, i * 0.09); tone(f, 0.12, 'triangle', 0.08, i * 0.09); }),
  combo: () => [660, 880, 1100].forEach((f, i) => tone(f, 0.1, 'triangle', 0.1, i * 0.07)),
  bonus: () => [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.15, 'triangle', 0.09, i * 0.06)), // 반짝반짝
  levelUp: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.18, 'square', 0.07, i * 0.1)),
};

// ===== 내 계정과 게임 데이터 =====
let ME = null;   // { id, username, nickname, character, data }
let D = null;    // ME.data: 인벤토리·건축물·설정 등
function defaultData() {
  return {
    lang: 'ko', level: 1, story: null, storyPos: {}, autoRead: false,
    blocks: 0, inv: {}, worlds: {}, biome: 'plains', ticketMs: 0, crafting: false, tools: { pickaxe: 0 },
    good: 0, bad: 0, best: { ko: 0, en: 0 }, imported: [],
  };
}
const xpLevel = () => Math.floor(D.blocks / 10) + 1;

let saveTimer;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 1500);
}
function saveNow() {
  clearTimeout(saveTimer);
  if (ME) API.saveProfile(ME).catch(e => console.warn('저장 실패', e));
}

// ===== 플레이 기록 (세션) — 모아서 DB에 한 줄씩 보낸다 =====
const FLUSH_KEYS = 80;       // 이만큼 치면 한 번 보냄 (최고 속도 기록 단위)
const KEY_GAP_CAP = 2000;    // 키 사이가 이보다 길면 쉰 것으로 보고 타자 시간에서 뺌
const IDLE_MS = 30000;       // 이만큼 아무것도 안 하면 플레이 시간에서 뺌
let SESS = null, pending = [], lastAct = 0;
function newSess() {
  SESS = { lang: D.lang, level: D.level, play_ms: 0, active_ms: 0, keys: 0, errors: 0, words: 0, blocks: 0 };
}
function flush() {
  if (!ME || !SESS) return;
  const s = SESS;
  newSess();
  if (s.keys || s.blocks || s.play_ms >= 5000) {
    s.active_ms = Math.round(s.active_ms);
    if ((s.lang === 'ko' || s.lang === 'en') && s.keys >= 60 && s.active_ms) {
      const v = Math.round(s.keys * 60000 / s.active_ms);
      if (v > (D.best[s.lang] || 0)) {
        const first = !D.best[s.lang];
        D.best[s.lang] = v;
        if (!first) { sfx.combo(); popup('🏅 새 최고 속도!', `${v} 타/분`); }
      }
    }
    pending.push(s);
  }
  const batch = pending; pending = [];
  batch.forEach(rec => API.addSession(rec).catch(e => { console.warn('기록 전송 실패', e); pending.push(rec); }));
  saveNow();
}
setInterval(() => {
  if (ME && SESS) {
    if (dayStr(new Date()) !== playDay) newDay(); // 자정이 지나면 다시 30분
    if (!limited && (view === 'play' || view === 'build') && document.visibilityState === 'visible' && performance.now() - lastAct < IDLE_MS) {
      SESS.play_ms += 1000;
      playedToday += 1000;
      checkLimit();
    }
    drawTimeLeft();
  }
  Arcade.tick(); // 게임 창이 열려 있으면 이용권 시간이 줄어든다
  updateLiveSpeed();
}, 1000);
['keydown', 'pointerdown'].forEach(ev => document.addEventListener(ev, () => { lastAct = performance.now(); }, true));
document.addEventListener('visibilitychange', () => { // 잠깐 가려질 때마다 작은 기록이 쌓이지 않게
  if (document.visibilityState === 'hidden' && SESS && (SESS.keys >= 20 || SESS.play_ms >= 60000)) flush();
});
window.addEventListener('pagehide', flush);

// ===== 하루 제한 시간: 캐기·만들기 화면에서 플레이한 시간이 계정마다 하루 30분까지 =====
const DAILY_LIMIT_MS = 30 * 60000;
const PARENT_PIN = '9090';          // 부모님 비밀번호: 넣으면 오늘 시간을 더 줌
const EXTRA_MS = 30 * 60000;        // 한 번에 더 주는 시간
const dayStr = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
// 오늘 쓸 수 있는 시간 = 기본 30분 + 부모님이 더 준 시간 (계정 데이터에 저장, 자정에 사라짐)
const limitMs = () => DAILY_LIMIT_MS + (D && D.extraTime && D.extraTime.day === playDay ? D.extraTime.ms : 0);
let playDay = dayStr(new Date()), playedToday = 0, limited = false, warned = {};
async function loadToday() { // 오늘 이미 플레이한 시간 (다른 컴퓨터에서 한 것도 포함)
  playDay = dayStr(new Date()); warned = {};
  try {
    const list = await API.mySessions();
    playedToday = list.filter(s => s.lang !== 'import' && dayStr(new Date(s.created_at)) === playDay).reduce((a, s) => a + s.play_ms, 0);
  } catch (e) { playedToday = 0; }
}
function newDay() {
  flush();
  playDay = dayStr(new Date()); playedToday = 0; warned = {};
  if (limited) setLimited(false);
}
function checkLimit() {
  const left = limitMs() - playedToday;
  if (left <= 0) setLimited(true);
  else if (left <= 60000 && !warned[1]) { warned[1] = warned[5] = true; sfx.combo(); popup('⏰ 1분 남았어요!', '이제 마무리해요'); }
  else if (left <= 5 * 60000 && !warned[5]) { warned[5] = true; sfx.combo(); popup('⏰ 5분 남았어요!', '슬슬 마무리할 준비를 해요'); }
}
function drawTimeLeft() {
  const left = Math.max(0, limitMs() - playedToday), el = $('timeLeft');
  el.hidden = !ME;
  el.textContent = left >= 60000 ? `⏱️ ${Math.ceil(left / 60000)}분 남음` : `⏱️ ${Math.ceil(left / 1000)}초 남음`;
  el.classList.toggle('low', left <= 5 * 60000);
}
function setLimited(on) {
  limited = on;
  if (on) {
    flush();
    input.blur();
    $('limitMsg').textContent = `오늘 ${Math.round(playedToday / 60000)}분 동안 열심히 했어요! 👏 캐기와 만들기는 내일 또 할 수 있어요.`;
    $('pinBox').hidden = true;
    sfx.levelUp();
  }
  $('limit').hidden = !(on && (view === 'play' || view === 'build'));
  drawTimeLeft();
}

// ===== 실시간 타자 속도: 최근 키 20번의 타수/분 =====
const recent = []; // { dt, good }
let lastKeyAt = 0;
function recordKeystroke(good) { // good: 이번에 맞게 늘어난 타수
  const now = performance.now();
  const dt = lastKeyAt ? Math.min(now - lastKeyAt, KEY_GAP_CAP) : 0;
  lastKeyAt = now;
  SESS.active_ms += dt;
  recent.push({ dt, good });
  if (recent.length > 20) recent.shift();
  updateLiveSpeed();
}
function liveSpeed() {
  if (performance.now() - lastKeyAt > 4000) return 0; // 멈추면 0
  const ms = recent.reduce((a, r) => a + r.dt, 0);
  return ms > 800 ? Math.round(recent.reduce((a, r) => a + r.good, 0) * 60000 / ms) : 0;
}
function updateLiveSpeed() {
  if (!D) return;
  const v = liveSpeed();
  $('sSpeed').textContent = v ? `${v}` : '-';
  $('sWpm').textContent = v ? (D.lang === 'en' ? `타/분 · ${Math.round(v / 5)} WPM` : '타/분') : '';
  $('speedFill').style.width = Math.min(100, v / (D.lang === 'en' ? 3 : 4)) + '%'; // 한글 400타, 영어 300타가 가득
  const best = D.best[D.lang];
  $('sBest').textContent = best ? best : '-';
}

// ===== 이번 판 상태 =====
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const $ = id => document.getElementById(id);
const input = $('typing');
const S = {
  deck: [], target: '', targetKeys: [], block: null,
  prevLen: 0, wordErr: false, combo: 0, locked: false,
};
const CHEERS = {
  ko: ['잘했어요!', '멋져요!', '최고예요!', '대단해요!', '우와!'],
  en: ['Great!', 'Awesome!', 'Nice!', 'Super!', 'Wow!'],
};

// ===== 키보드 그리기 =====
const ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'back'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['shiftL', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'shiftR'],
  ['space'],
];
const KO_LABEL = {};
for (const [j, k] of Object.entries(JAMO_KEY)) if (!k.startsWith('^')) KO_LABEL[k] = j;
const SPECIAL = { back: '← 지우기', shiftL: 'Shift', shiftR: 'Shift', space: '스페이스' };
function drawKeyboard() {
  $('keyboard').innerHTML = ROWS.map(row => '<div class="row">' + row.map(k => {
    const cls = ['key'];
    if (SPECIAL[k]) cls.push(k === 'space' ? 'space' : 'wide');
    if (k === 'f' || k === 'j') cls.push('home');
    let label = SPECIAL[k] || k;
    if (!SPECIAL[k] && /[a-z]/.test(k)) label = D.lang === 'ko' ? `${KO_LABEL[k]}<small>${k}</small>` : k.toUpperCase();
    return `<div class="${cls.join(' ')}" data-k="${k}">${label}</div>`;
  }).join('') + '</div>').join('');
}
function highlight(tok, fix) {
  document.querySelectorAll('.key.next, .key.fix').forEach(e => e.classList.remove('next', 'fix'));
  if (fix) return $('keyboard').querySelector('[data-k="back"]').classList.add('fix');
  if (!tok) return;
  const shift = tok.startsWith('^');
  const k = shift ? tok.slice(1) : tok;
  $('keyboard').querySelector(`[data-k="${CSS.escape(k)}"]`)?.classList.add('next');
  if (shift) ['shiftL', 'shiftR'].forEach(s => $('keyboard').querySelector(`[data-k="${s}"]`).classList.add('next'));
}

// ===== 문제 내기 =====
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function stories() { return CONTENT[D.lang][4]; }
function nextTarget() {
  if (D.level === 4) {
    const lines = stories()[D.story];
    let idx = D.storyPos[D.story] || 0;
    if (idx >= lines.length) {
      popup(D.lang === 'ko' ? '📖 이야기 끝! 🎉' : '📖 The End! 🎉', D.story);
      sfx.levelUp();
      idx = D.storyPos[D.story] = 0;
    }
    S.target = lines[idx];
    $('progress').textContent = `📖 ${D.story}  ${idx + 1} / ${lines.length}`;
  } else {
    if (!S.deck.length) S.deck = shuffle(CONTENT[D.lang][D.level]).filter(w => w !== S.target);
    S.target = S.deck.pop();
    $('progress').textContent = '';
  }
  S.targetKeys = toKeys(S.target);
  S.prevLen = 0; S.wordErr = false;
  S.block = pick(BLOCKS.filter(b => b.lvl === D.level)); // 이번에 캘 블록 = 받을 보상
  $('target').classList.toggle('long', S.target.length > 14);
  $('block').style.backgroundImage = `url(${S.block.url})`;
  $('block').className = '';
  $('crack').style.opacity = 0;
  render('');
  if (D.autoRead) speak();
}

function speak() {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(S.target);
  u.lang = D.lang === 'ko' ? 'ko-KR' : 'en-US';
  u.rate = 0.85;
  speechSynthesis.speak(u);
}

// ===== 입력 처리 =====
function isPrefix(a, b) { return a.length <= b.length && a.every((k, i) => k === b[i]); }

function render(typed) {
  const tk = toKeys(typed);
  const ok = isPrefix(tk, S.targetKeys);
  const t = [...S.target], u = [...typed];
  $('target').innerHTML = t.map((ch, i) => {
    let cls = 'todo';
    if (i < u.length) {
      if (u[i] === ch) cls = 'ok';
      else if (i === u.length - 1 && ok) cls = 'now'; // 아직 조합 중인 글자
      else cls = 'bad';
    } else if (i === u.length) cls = 'now';
    return `<span class="${cls}">${ch === ' ' ? '&nbsp;' : ch}</span>`;
  }).join('');
  highlight(ok ? S.targetKeys[tk.length] : null, !ok);
  return { tk, ok };
}

function onInput() {
  if (S.locked || limited) return;
  let typed = input.value;
  if (/^\s/.test(typed) && !/^\s/.test(S.target)) { typed = typed.trimStart(); input.value = typed; }

  const { tk, ok } = render(typed);
  const hangul = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(typed);
  if (D.lang === 'ko' && /[a-zA-Z]/.test(typed)) setHint('⌨️ 한/영 키를 눌러서 한글로 바꿔요!', true);
  else if (D.lang === 'en' && hangul) setHint('⌨️ 한/영 키를 눌러서 영어로 바꿔요!', true);
  else if (!ok) setHint('앗! 틀렸어요. ← 지우기 키를 눌러요', true);
  else setHint('');

  const grew = tk.length - S.prevLen; // 보통 1타씩 늘어남
  if (grew) recordKeystroke(grew > 0 && ok ? grew : 0);
  if (grew > 0) {
    if (ok) {
      D.good += grew; SESS.keys += grew;
      sfx.key(tk.length / S.targetKeys.length);
      swing();
      $('crack').style.opacity = 0.9 * tk.length / S.targetKeys.length;
    } else {
      D.bad++; SESS.errors++; S.wordErr = true;
      sfx.error(); creeper();
      input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
    }
  }
  S.prevLen = tk.length;
  updateStats();
  if (ok && tk.length === S.targetKeys.length) complete();
}

function complete() {
  S.locked = true;
  D.blocks++; SESS.blocks++; SESS.words++;
  S.combo = S.wordErr ? 0 : S.combo + 1;
  if (D.level === 4) D.storyPos[D.story] = (D.storyPos[D.story] || 0) + 1;

  sfx.break();
  breakParticles();
  $('block').className = 'break';
  const m = $('miner');
  m.classList.remove('cheer'); void m.offsetWidth; m.classList.add('cheer');
  D.inv[S.block.id] = (D.inv[S.block.id] || 0) + 1;
  drawInventory(S.block.id);

  if (S.combo && S.combo % 5 === 0) { sfx.combo(); setHint(`🔥 ${S.combo} 콤보! ${pick(CHEERS[D.lang])}`); }
  else setHint(`${pick(CHEERS[D.lang])}  +1 ${S.block.name}`);

  // 보너스 블록: 쉬움 단계는 5콤보마다 꼭, 그 밖에는 가끔 운 좋게
  const comboBonus = D.level === 1 && S.combo && S.combo % 5 === 0;
  const bonus = comboBonus || Math.random() < bonusChanceAt((D.tools && D.tools.pickaxe) || 0);
  if (bonus) giveBonus(comboBonus ? `🔥 ${S.combo} 콤보 보너스!` : '🍀 행운의 보너스!');

  if (D.blocks % 10 === 0) { // 보너스 팝업이 떠 있으면 다 본 뒤에
    setTimeout(() => { sfx.levelUp(); confetti(); popup(`⭐ 레벨 ${xpLevel()}! ⭐`, D.lang === 'ko' ? '블록 10개를 캤어요!' : '10 blocks mined!'); }, bonus ? 1900 : 300);
  }
  updateStats();
  if (SESS.keys >= FLUSH_KEYS) flush(); else scheduleSave();

  // 한글 조합이 남아 있지 않도록 입력칸을 잠깐 비활성화했다가 비운다
  setTimeout(() => {
    input.blur(); input.value = '';
    nextTarget();
    setTimeout(() => { input.value = ''; if (view === 'play') input.focus(); S.locked = false; }, 30);
  }, 350);
}

// ===== 보너스 블록 (인벤토리에만 들어가고 점수·순위에는 안 들어감) =====
const BONUS_CHANCE = 0.1;
const bonusChanceAt = tier => BONUS_CHANCE + 0.03 * tier; // 곡괭이가 좋을수록 보너스가 더 자주 (돌 13% · 철 16% · 다이아 19%)
function giveBonus(title) {
  const b = pick(BLOCKS.filter(x => x.lvl === Math.min(D.level + 1, 4))); // 한 단계 위의 귀한 블록
  D.inv[b.id] = (D.inv[b.id] || 0) + 1;
  drawInventory(b.id);
  sfx.bonus();
  const r = $('block').getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, ['#ffe066', '#fff6a0', ...b.colors], 24, 160);
  popup(`🎁 ${title}`, `<img src="${b.url}" alt=""> ${b.name} +1`);
}

// ===== 화면 효과 =====
function swing() {
  const m = $('miner');
  m.classList.remove('swing'); void m.offsetWidth; m.classList.add('swing');
  const b = $('block');
  setTimeout(() => { b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 80); }, 90); // 곡괭이가 닿는 순간
}
function setMiner(id) {
  const c = CHARS[id], m = $('miner');
  m.querySelector('.m-head').style.backgroundImage = `url(${c.faceUrl})`;
  m.querySelector('.m-body').style.background = c.shirt;
  m.querySelector('.m-legs').style.backgroundColor = c.pants;
  m.querySelector('.m-arm').style.background = `linear-gradient(${c.shirt} 0 65%, ${c.hand} 65%)`;
  m.querySelector('.m-tool').style.backgroundImage = `url(${PICKAXES[(D.tools && D.tools.pickaxe) || 0].url})`; // 작업대에서 만든 곡괭이
}
let hintTimer;
function setHint(msg, sticky) {
  $('hint').textContent = msg;
  clearTimeout(hintTimer);
  if (msg && !sticky) hintTimer = setTimeout(() => $('hint').textContent = '', 1500);
}
let creeperTimer;
function creeper() {
  const c = $('creeper');
  c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
  clearTimeout(creeperTimer);
  creeperTimer = setTimeout(() => c.classList.remove('show'), 1200);
}
function burst(x, y, colors, n, spread) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    p.className = 'p';
    p.style.left = x + 'px'; p.style.top = y + 'px';
    p.style.background = pick(colors);
    $('particles').appendChild(p);
    const ang = Math.random() * Math.PI * 2, dist = spread * (0.4 + Math.random());
    p.animate([
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist + 80}px) rotate(${Math.random() * 360}deg)`, opacity: 0 },
    ], { duration: 700 + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => p.remove();
  }
}
function breakParticles() {
  const r = $('block').getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, S.block.colors, 18, 110);
}
function confetti() {
  burst(innerWidth / 2, innerHeight / 3, ['#ffe066', '#7CFC00', '#5decf5', '#ff7b7b', '#c77dff'], 60, 350);
}
function popup(title, sub) {
  const p = $('popup');
  p.innerHTML = `${title}<small>${sub}</small>`;
  p.hidden = false;
  clearTimeout(p._t);
  p._t = setTimeout(() => p.hidden = true, 1800);
}
// 인벤토리 칸 (만들기 화면의 블록 고르기에서도 씀)
function slotsHTML(onlyOwned, selId, newId) {
  return BLOCKS.filter(b => !onlyOwned || D.inv[b.id]).map(b => {
    const n = D.inv[b.id] || 0;
    const cls = ['slot', b.id === newId && 'new', b.id === selId && 'sel', !n && 'empty'].filter(Boolean).join(' ');
    return `<div class="${cls}" data-id="${b.id}" title="${b.name}"><img src="${b.url}" alt="${b.name}"><b>${n}</b></div>`;
  }).join('');
}
function drawInventory(newId) {
  $('items').innerHTML = slotsHTML(true, null, newId) || '<span style="color:#aaa">아직 없어요. 타자로 블록을 캐 보세요!</span>';
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function updateStats() {
  $('sBlocks').textContent = D.blocks;
  $('sCombo').textContent = S.combo;
  $('sAcc').textContent = (D.good + D.bad ? Math.round(100 * D.good / (D.good + D.bad)) : 100) + '%';
  $('xpFill').style.width = (D.blocks % 10) * 10 + '%';
  $('xpText').textContent = `레벨 ${xpLevel()}  (${D.blocks % 10} / 10)`;
  updateLiveSpeed();
}

// ===== 화면 전환 =====
let view = 'play';
function showView(v) {
  if (limited && (v === 'play' || v === 'build')) { $('limit').hidden = false; return; } // 오늘 시간을 다 썼으면 잠금
  if (v !== view) flush();
  view = v;
  ['play', 'build', 'rank', 'growth', 'gallery', 'arcade', 'craft'].forEach(id => $(id).hidden = id !== v);
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  if (v === 'build') Build.open();
  else if (v === 'rank') Stats.rank();
  else if (v === 'growth') Stats.growth();
  else if (v === 'gallery') Gallery.open();
  else if (v === 'arcade') Arcade.open();
  else if (v === 'craft') Craft.open();
  else { drawInventory(); input.focus(); }
}
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => showView(b.dataset.view));

// ===== 설정 =====
function applySettings() {
  if (SESS && (SESS.lang !== D.lang || SESS.level !== D.level)) flush(); // 속도는 언어·단계별로 따로 기록
  document.querySelectorAll('#langSeg button').forEach(b => b.classList.toggle('on', b.dataset.lang === D.lang));
  $('levelSel').innerHTML = Object.entries(LEVELS[D.lang]).map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
  $('levelSel').value = D.level;
  const names = Object.keys(stories());
  if (!names.includes(D.story)) D.story = names[0];
  $('storySel').innerHTML = names.map(n => `<option>${n}</option>`).join('');
  $('storySel').value = D.story;
  $('storySel').hidden = D.level !== 4;
  $('readBtn').classList.toggle('off', !D.autoRead);
  S.deck = [];
  recent.length = 0;
  drawKeyboard();
  drawInventory();
  updateStats();
  input.value = '';
  nextTarget();
  scheduleSave();
  if (view === 'play') input.focus();
}
document.querySelectorAll('#langSeg button').forEach(b => b.onclick = () => { D.lang = b.dataset.lang; applySettings(); });
$('levelSel').onchange = e => { D.level = +e.target.value; applySettings(); };
$('storySel').onchange = e => { D.story = e.target.value; applySettings(); };
$('soundBtn').onclick = () => {
  soundOn = !soundOn;
  $('soundBtn').classList.toggle('off', !soundOn);
  try { localStorage.setItem('typeMineSound', soundOn ? 'on' : 'off'); } catch (e) {}
};
$('readBtn').onclick = () => { D.autoRead = !D.autoRead; $('readBtn').classList.toggle('off', !D.autoRead); if (D.autoRead) speak(); scheduleSave(); input.focus(); };
$('target').onclick = () => { speak(); input.focus(); };
$('creeper').style.backgroundImage = `url(${CHARS.creeper.faceUrl})`;
$('crack').style.backgroundImage = `url(${CRACK})`;
$('soundBtn').classList.toggle('off', !soundOn);

input.addEventListener('input', onInput);
input.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); ac(); });
document.addEventListener('click', e => {
  if (view === 'play' && ME && !limited && $('me').hidden && !e.target.closest('select, input, button')) input.focus();
});

// ===== 캐릭터 고르기 칸 =====
function charGridHTML(cur) {
  return Object.entries(CHARS).map(([id, c]) =>
    `<button type="button" class="char${id === cur ? ' cur' : ''}" data-id="${id}"><img src="${c.faceUrl}" alt=""><span class="nm">${c.name}</span></button>`).join('');
}

// ===== 로그인 / 가입 =====
let authMode = 'login', signupChar = 'steve';
function showAuth() {
  $('auth').hidden = false;
  $('modeNote').textContent = API.online
    ? '🌐 온라인 모드: 어느 컴퓨터에서든 아이디로 로그인할 수 있어요.'
    : '💻 이 컴퓨터 전용 모드: 기록이 이 브라우저에만 저장돼요. (온라인으로 쓰려면 README 참고)';
  setAuthMode(authMode);
}
function setAuthMode(m) {
  authMode = m;
  document.querySelectorAll('#authTabs button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  $('authForm').classList.toggle('login', m === 'login');
  $('authForm').password.autocomplete = m === 'login' ? 'current-password' : 'new-password';
  $('signupChars').innerHTML = charGridHTML(signupChar);
  $('authBtn').textContent = m === 'login' ? '로그인 ▶' : '가입하고 시작하기 ▶';
  $('authErr').textContent = '';
}
document.querySelectorAll('#authTabs button').forEach(b => b.onclick = () => setAuthMode(b.dataset.mode));
$('signupChars').onclick = e => {
  const b = e.target.closest('.char');
  if (b) { signupChar = b.dataset.id; $('signupChars').innerHTML = charGridHTML(signupChar); }
};
$('authForm').onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  const username = f.username.value.trim().toLowerCase(), password = f.password.value;
  $('authErr').textContent = '';
  $('authBtn').disabled = true;
  try {
    let p;
    if (authMode === 'signup') {
      if (password !== f.password2.value) throw new Error('비밀번호 두 개가 달라요.');
      const nickname = f.nickname.value.trim() || username;
      p = await API.signUp(username, password, nickname.slice(0, 10), signupChar, defaultData());
    } else {
      p = await API.signIn(username, password);
      if (!p) throw new Error('계정 정보를 찾을 수 없어요.');
    }
    f.reset();
    enter(p);
  } catch (err) {
    $('authErr').textContent = err.message || String(err);
  } finally {
    $('authBtn').disabled = false;
  }
};

async function enter(p) {
  ME = p;
  D = ME.data = Object.assign(defaultData(), p.data);
  $('auth').hidden = true;
  updateHeader();
  setMiner(ME.character);
  S.combo = 0;
  newSess();
  applySettings();
  await loadToday();
  limited = false;
  checkLimit();
  drawTimeLeft();
  showView('play');
}
function updateHeader() {
  $('whoFace').src = CHARS[ME.character].faceUrl;
  $('whoName').textContent = ME.nickname;
}

// ===== 내 정보: 캐릭터 바꾸기, 예전 기록 가져오기, 로그아웃 =====
$('who').onclick = () => {
  if (!ME) return;
  $('meTitle').textContent = `${ME.nickname} (${ME.username})`;
  $('meChars').innerHTML = charGridHTML(ME.character);
  $('importBox').hidden = true;
  $('me').hidden = false;
};
$('meClose').onclick = () => { $('me').hidden = true; if (view === 'play') input.focus(); };
$('meChars').onclick = e => {
  const b = e.target.closest('.char');
  if (!b) return;
  ME.character = b.dataset.id;
  $('meChars').innerHTML = charGridHTML(ME.character);
  updateHeader(); setMiner(ME.character); saveNow();
};
async function logout() {
  Arcade.close();
  flush();
  await API.signOut();
  ME = D = SESS = null;
  limited = false;
  $('me').hidden = $('limit').hidden = $('timeLeft').hidden = true;
  showAuth();
}
$('logoutBtn').onclick = logout;
$('limitRank').onclick = () => { $('limit').hidden = true; showView('rank'); };
$('limitGrowth').onclick = () => { $('limit').hidden = true; showView('growth'); };
$('limitGallery').onclick = () => { $('limit').hidden = true; showView('gallery'); };
$('limitArcade').onclick = () => { $('limit').hidden = true; showView('arcade'); };

// 부모님 비밀번호로 30분 더 주기 (3번 틀리면 1분 동안 못 넣음)
let pinFails = 0, pinBlockedUntil = 0;
$('extraBtn').onclick = () => {
  $('pinBox').hidden = false;
  $('pinMsg').textContent = '';
  $('pinInput').value = '';
  $('pinInput').focus();
};
$('pinForm').onsubmit = e => {
  e.preventDefault();
  if (Date.now() < pinBlockedUntil) {
    $('pinMsg').textContent = `너무 많이 틀렸어요. ${Math.ceil((pinBlockedUntil - Date.now()) / 1000)}초 뒤에 다시 해 주세요.`;
    return;
  }
  if ($('pinInput').value !== PARENT_PIN) {
    $('pinInput').value = '';
    if (++pinFails >= 3) { pinFails = 0; pinBlockedUntil = Date.now() + 60000; $('pinMsg').textContent = '3번 틀렸어요. 1분 뒤에 다시 해 주세요.'; }
    else $('pinMsg').textContent = '비밀번호가 틀렸어요.';
    sfx.error();
    return;
  }
  pinFails = 0;
  const extra = D.extraTime && D.extraTime.day === playDay ? D.extraTime.ms : 0;
  D.extraTime = { day: playDay, ms: extra + EXTRA_MS };
  saveNow();
  warned = {};
  setLimited(false);
  confetti(); sfx.levelUp();
  popup('⏰ 30분 더!', '부모님이 시간을 더 주셨어요');
  showView('play');
};
$('limitLogout').onclick = () => logout();

// v1(game/type)의 저장 데이터: { profiles: { steve: {...}, ... } }
let v1Profiles = null;
function showImportList() {
  const list = Object.entries(v1Profiles || {}).filter(([, p]) => p.blocks > 0);
  $('importMsg').textContent = list.length
    ? '가져올 캐릭터를 골라요. 블록·인벤토리·건축물·플레이 기록이 이 계정에 더해져요.'
    : '이 브라우저에서 예전 기록을 찾지 못했어요. 파일이 있다면 아래에서 골라요.';
  $('importList').innerHTML = list.map(([id, p]) => {
    const done = D.imported.includes(id);
    return `<button class="char" data-id="${id}" ${done ? 'disabled' : ''}><img src="${CHARS[id]?.faceUrl || ''}" alt=""><span class="nm">${CHARS[id]?.name || id}</span><span>블록 ${p.blocks}${done ? ' ✓' : ''}</span></button>`;
  }).join('');
}
$('importBtn').onclick = () => {
  try { v1Profiles = JSON.parse(localStorage.getItem('typeMine2') || '{}').profiles || null; } catch (e) { v1Profiles = null; }
  $('importBox').hidden = false;
  showImportList();
};
$('importFile').onchange = async e => {
  try {
    const j = JSON.parse(await e.target.files[0].text());
    v1Profiles = j.profiles || j;
  } catch (err) { v1Profiles = null; }
  showImportList();
};
$('importList').onclick = e => {
  const b = e.target.closest('.char');
  if (!b || b.disabled) return;
  const id = b.dataset.id, p = v1Profiles[id];
  D.blocks += p.blocks || 0;
  D.good += p.good || 0;
  D.bad += p.bad || 0;
  Object.entries(p.inv || {}).forEach(([k, n]) => { if (BLOCK[k]) D.inv[k] = (D.inv[k] || 0) + n; });
  if (p.world) { // 예전 건축물은 평원의 빈 칸에 옮김
    const w = Build.world('plains');
    p.world.forEach((blk, i) => { if (blk && BLOCK[blk] && !w[i]) w[i] = blk; });
  }
  D.imported.push(id);
  // 예전 플레이는 'import' 기록 한 줄로 남긴다 (속도 순위에는 안 들어감)
  pending.push({ lang: 'import', level: p.level || 1, play_ms: Math.round(p.msDone || 0), active_ms: Math.round(p.msDone || 0), keys: p.keysDone || 0, errors: p.bad || 0, words: p.blocks || 0, blocks: p.blocks || 0 });
  flush();
  updateStats(); drawInventory();
  showImportList();
  popup('📦 가져왔어요!', `${CHARS[id]?.name || id} · 블록 ${p.blocks}개`);
};

// 시작: 로그인되어 있으면 바로, 아니면 로그인 화면
window.addEventListener('DOMContentLoaded', () => {
  API.restore().then(p => p ? enter(p) : showAuth()).catch(() => showAuth());
});

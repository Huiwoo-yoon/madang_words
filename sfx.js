// ===== 블록 마당 효과음 (Web Audio로 직접 합성 — 소리 파일 없음) =====
// Sfx.play('이름', …) 로 낸다. 켜고 끄기는 모든 놀이가 같이 쓴다 (localStorage 'bm.sound').
// 소리 종류
//   3D 블록 세상: step(재질), jump, land, breakBlock(재질), place(재질), deny, checkpoint, goal, fall, fly
//   공용: click, pop, coin, wrong, tick, win, lose, gulp, clang, ttak, whiff
//   목소리(캐릭터·몬스터): yay, hum, hiss, zombie, skeleton, ender, oink, villager, slime, squeak, howl, bark,
//     spider, robot, ghost, sparkle, witch, roar, golem, whoosh, growl, fanfare, boing, sing, yoshi, clink, splash, thunder
const Sfx = (() => {
  const KEY = 'bm.sound';
  let on = true;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch {}
  let ctx = null, master = null, noiseBuf = null;

  function ac() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  // 음 하나: type(파형), to(높이가 미끄러질 곳), vib(떨림 폭 Hz)
  function tone(freq, dur, { type = 'square', vol = 0.1, at = 0, to = null, vib = 0, vibRate = 6, attack = 0.005 } = {}) {
    const a = ac(), t = a.currentTime + at;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    if (vib) {
      const l = a.createOscillator(), lg = a.createGain();
      l.frequency.value = vibRate; lg.gain.value = vib;
      l.connect(lg).connect(o.frequency);
      l.start(t); l.stop(t + dur);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  // 쉬익·퍽 같은 잡음: filter 종류와 freq(높낮이)로 소리 색을 바꾼다
  function noise(dur, { filter = 'lowpass', freq = 1000, q = 1, vol = 0.2, at = 0, to = null, attack = 0.003 } = {}) {
    const a = ac(), t = a.currentTime + at;
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf;
    f.type = filter; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  const notes = (list, gap, opts) => list.forEach((f, i) => tone(f, opts.dur || gap * 1.4, { ...opts, at: (opts.at || 0) + i * gap }));
  const rnd = (a, b) => a + Math.random() * (b - a);

  // 블록 재질마다 발소리·부수는 소리 색이 다르다
  const MAT = { grass: { f: 900, q: 0.7 }, sand: { f: 2500, q: 0.5 }, wood: { f: 500, q: 3 }, stone: { f: 1400, q: 2 }, glass: { f: 3000, q: 5 } };
  const mat = (m) => MAT[m] || MAT.stone;

  const SOUNDS = {
    // ----- 3D 블록 세상 -----
    step: (m) => noise(0.07, { filter: 'bandpass', freq: mat(m).f * rnd(0.85, 1.15), q: mat(m).q, vol: 0.12 }),
    jump: () => noise(0.12, { filter: 'bandpass', freq: 600, to: 1400, vol: 0.08 }),
    land: () => { noise(0.12, { filter: 'lowpass', freq: 400, vol: 0.25 }); tone(90, 0.1, { type: 'sine', vol: 0.15, to: 60 }); },
    breakBlock: (m) => {
      for (let i = 0; i < 4; i++) noise(0.09, { filter: 'bandpass', freq: mat(m).f * rnd(0.6, 1.3), q: mat(m).q, vol: 0.22, at: i * 0.035 });
      if (m === 'glass') notes([2600, 3200, 2200], 0.04, { type: 'triangle', vol: 0.06 });
    },
    place: (m) => { noise(0.08, { filter: 'lowpass', freq: mat(m).f * 0.6, vol: 0.3 }); tone(m === 'wood' ? 220 : 160, 0.06, { type: 'triangle', vol: 0.1 }); },
    deny: () => tone(110, 0.18, { type: 'square', vol: 0.06, to: 90 }),
    checkpoint: () => notes([784, 1175], 0.09, { type: 'triangle', vol: 0.1 }),
    goal: () => notes([523, 659, 784, 1047, 1319], 0.08, { type: 'square', vol: 0.07, dur: 0.2 }),
    fall: () => tone(600, 0.5, { type: 'sine', vol: 0.08, to: 120 }),
    fly: () => noise(0.3, { filter: 'bandpass', freq: 500, to: 2000, q: 2, vol: 0.1 }),
    // ----- 공용 -----
    click: () => tone(1200, 0.03, { type: 'square', vol: 0.04 }),
    pop: () => tone(500, 0.08, { type: 'sine', vol: 0.15, to: 900 }),
    coin: () => { tone(988, 0.07, { type: 'square', vol: 0.07 }); tone(1319, 0.25, { type: 'square', vol: 0.07, at: 0.07 }); },
    wrong: () => { tone(220, 0.18, { type: 'sawtooth', vol: 0.06, to: 180 }); tone(165, 0.3, { type: 'sawtooth', vol: 0.06, at: 0.15, to: 120 }); },
    tick: () => tone(1500, 0.03, { type: 'square', vol: 0.05 }),
    win: () => notes([523, 659, 784, 1047, 784, 1047], 0.1, { type: 'square', vol: 0.07, dur: 0.16 }),
    lose: () => notes([392, 349, 311, 262], 0.16, { type: 'triangle', vol: 0.09, dur: 0.25 }),
    gulp: () => [0, 0.12].forEach((at) => tone(300, 0.1, { type: 'sine', vol: 0.14, to: 150, at })),
    clang: () => { tone(1800, 0.4, { type: 'triangle', vol: 0.08 }); tone(2700, 0.3, { type: 'sine', vol: 0.05 }); noise(0.05, { filter: 'highpass', freq: 3000, vol: 0.1 }); },
    ttak: () => { noise(0.06, { filter: 'highpass', freq: 1500, vol: 0.35 }); tone(180, 0.08, { type: 'square', vol: 0.08, to: 90 }); },
    whiff: () => noise(0.18, { filter: 'bandpass', freq: 900, to: 300, q: 1.5, vol: 0.1 }),
    // ----- 목소리 (캐릭터·몬스터) -----
    yay: () => notes([660, 880, 1320], 0.06, { type: 'square', vol: 0.06 }),
    hum: () => tone(220, 0.16, { type: 'sawtooth', vol: 0.07, to: 160 }),            // "웁"
    hum2: () => tone(300, 0.16, { type: 'sawtooth', vol: 0.07, to: 220 }),
    hiss: () => noise(0.7, { filter: 'highpass', freq: 3000, vol: 0.16, attack: 0.3 }), // 쉬이익
    zombie: () => tone(110, 0.7, { type: 'sawtooth', vol: 0.09, to: 85, vib: 8, vibRate: 5 }), // 으어어
    skeleton: () => { for (let i = 0; i < 6; i++) noise(0.03, { filter: 'highpass', freq: 2500, vol: 0.18, at: i * 0.05 }); }, // 달그락
    ender: () => tone(180, 0.6, { type: 'sine', vol: 0.12, to: 420, vib: 40, vibRate: 18 }),
    oink: () => [0, 0.15].forEach((at) => tone(260, 0.12, { type: 'sawtooth', vol: 0.08, to: 190, at })),
    villager: () => tone(190, 0.35, { type: 'sawtooth', vol: 0.08, to: 150, vib: 15, vibRate: 9 }), // 흐음
    slime: () => { tone(300, 0.2, { type: 'sine', vol: 0.15, to: 90 }); noise(0.12, { filter: 'lowpass', freq: 500, vol: 0.1 }); }, // 말랑
    squeak: () => [0, 0.08, 0.16].forEach((at) => tone(2400, 0.05, { type: 'sine', vol: 0.06, to: 3000, at })), // 찍찍
    howl: () => tone(400, 0.9, { type: 'sine', vol: 0.1, to: 650, vib: 12, vibRate: 6 }),   // 아우우
    bark: () => [0, 0.18].forEach((at) => { noise(0.07, { filter: 'bandpass', freq: 900, q: 2, vol: 0.2, at }); tone(350, 0.08, { type: 'sawtooth', vol: 0.06, to: 250, at }); }), // 멍멍
    spider: () => { for (let i = 0; i < 5; i++) noise(0.025, { filter: 'bandpass', freq: 4000, q: 4, vol: 0.15, at: i * 0.06 }); noise(0.3, { filter: 'highpass', freq: 2500, vol: 0.06, at: 0.3 }); },
    robot: () => notes([880, 660, 990, 770], 0.07, { type: 'square', vol: 0.06 }),        // 삐빅
    ghost: () => tone(300, 1, { type: 'sine', vol: 0.1, to: 450, vib: 20, vibRate: 4 }),    // 우우~
    sparkle: () => notes([1568, 2093, 2637, 3136], 0.05, { type: 'triangle', vol: 0.06, dur: 0.2 }), // 반짝
    witch: () => [0, 0.1, 0.2, 0.3].forEach((at, i) => tone(700 - i * 40, 0.08, { type: 'sawtooth', vol: 0.05, at })), // 히히히
    roar: () => { tone(160, 0.8, { type: 'sawtooth', vol: 0.1, to: 70, vib: 10, vibRate: 13 }); noise(0.8, { filter: 'lowpass', freq: 700, vol: 0.15 }); }, // 크아앙
    golem: () => { tone(60, 0.4, { type: 'sine', vol: 0.25, to: 40 }); noise(0.2, { filter: 'lowpass', freq: 300, vol: 0.2 }); }, // 쿵
    whoosh: () => noise(0.35, { filter: 'bandpass', freq: 400, to: 3000, q: 3, vol: 0.12 }),
    growl: () => tone(90, 0.7, { type: 'sawtooth', vol: 0.11, to: 70, vib: 15, vibRate: 22 }), // 그르르
    fanfare: () => notes([392, 523, 659, 784, 659, 784], 0.09, { type: 'square', vol: 0.07, dur: 0.15 }),
    boing: () => tone(300, 0.25, { type: 'square', vol: 0.06, to: 900 }),                   // 뾰잉
    sing: () => notes([659, 784, 988, 1175], 0.08, { type: 'triangle', vol: 0.08, dur: 0.14 }),
    yoshi: () => tone(500, 0.15, { type: 'sine', vol: 0.12, to: 1500 }),                     // 뾱
    clink: () => tone(2400, 0.15, { type: 'triangle', vol: 0.07 }),                          // 곡괭이 땡
    splash: () => noise(0.5, { filter: 'lowpass', freq: 3000, to: 400, vol: 0.18 }),         // 철썩
    thunder: () => { noise(0.9, { filter: 'lowpass', freq: 1200, to: 200, vol: 0.3 }); noise(0.1, { filter: 'highpass', freq: 4000, vol: 0.15 }); }, // 콰르릉
  };

  // 놀이마다 캐릭터 → 목소리
  const VOICES = {
    // 딱지치기·투호 (마당 캐릭터)
    madang: { kid: 'boing', grandpa: 'hum', ninja: 'sing', boss: 'villager', wizard: 'ghost', hero: 'sing', robot: 'hiss', dragon: 'yoshi',
      odysseus: 'clang', cyclops: 'golem', athena: 'sparkle', medusa: 'hiss', poseidon: 'splash', zeus: 'thunder' },
    // 타자연습 캐릭터
    type: { steve: 'hum', alex: 'hum2', creeper: 'hiss', zombie: 'zombie', skeleton: 'skeleton', enderman: 'ender', pig: 'oink', villager: 'villager' },
  };

  const api = {
    play(name, ...args) {
      if (!on || !SOUNDS[name]) return;
      try { SOUNDS[name](...args); } catch (e) { console.warn('효과음 오류', name, e); } // 소리가 안 나도 놀이는 계속
    },
    voice(game, charId) { api.play((VOICES[game] || {})[charId] || 'yay'); },
    get on() { return on; },
    toggle() {
      on = !on;
      try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch {}
      return on;
    },
    // 🔊/🔇 버튼 만들기
    button(el) {
      const draw = () => { el.textContent = on ? '🔊' : '🔇'; el.title = on ? '효과음 끄기' : '효과음 켜기'; };
      draw();
      el.addEventListener('click', () => { api.toggle(); draw(); api.play('pop'); });
    },
  };
  return api;
})();

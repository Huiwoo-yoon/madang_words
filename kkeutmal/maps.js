// ===== 3D 맵 만들기: 내 세계, 파쿠르, 미로 =====
// 맵 = { size:[W,H,D], data: Uint8Array(블록 번호), spawn:[x,y,z], yaw, sky }
const Maps = (() => {
  const N = (id) => Blocks.BY_ID[id].num;
  function blank(W, H, D) {
    const data = new Uint8Array(W * H * D);
    const set = (x, y, z, id) => { if (x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < D) data[x + W * (z + D * y)] = N(id); };
    return { data, set };
  }

  // 🏠 내 세계: 32×32 평평한 땅 (맨 아래는 부술 수 없는 기반암, 그 위에 흙과 잔디)
  const MY = [32, 24, 32];
  function myWorld(saved) {
    const [W, H, D] = MY;
    let data;
    if (saved) data = Uint8Array.from(atob(saved), (c) => c.charCodeAt(0));
    if (!data || data.length !== W * H * D) {
      const m = blank(W, H, D);
      for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) { m.set(x, 0, z, 'bedrock'); m.set(x, 1, z, 'dirt'); m.set(x, 2, z, 'grass'); }
      data = m.data;
    }
    return { size: MY, data, spawn: [W / 2, 3, D / 2], yaw: 0, sky: '#8ec8ff' };
  }
  const pack = (data) => { let s = ''; for (let i = 0; i < data.length; i += 8192) s += String.fromCharCode.apply(null, data.subarray(i, i + 8192)); return btoa(s); };

  // 🏃 파쿠르 20단계: 허공에 떠 있는 발판을 뛰어서 건너 도착 블록까지.
  // 같은 레벨은 언제나 같은 맵이다 (씨앗 숫자로 만든다) → 레벨마다 실패 횟수·시간으로 순위를 겨룬다.
  // 점프 거리는 20단계가 예전 5단계(가장 어려웠던 것)쯤이고, 대신 장애물·몹이 늘어난다.
  const PARKOUR_LEVELS = 20;
  const THEMES = [
    { name: '초원', icon: '🌳', sky: '#9fd4ff', mats: ['grass', 'leaves', 'planks', 'log'], bush: 'leaves' },
    { name: '사막', icon: '🏜️', sky: '#ffd9a0', mats: ['sand', 'planks', 'brick', 'gold'], bush: 'cactus' },
    { name: '용암 동굴', icon: '🔥', sky: '#3a120c', mats: ['cobble', 'stone', 'brick', 'coal', 'iron'], bush: 'cobble', sea: true },
    { name: '하늘 성', icon: '🌌', sky: '#2a2060', mats: ['lapis', 'iron', 'gold', 'diamond', 'emerald'], bush: 'glass' },
  ];
  // 레벨마다 나오는 것: h 장애물(넘어가기) · c 선인장 · l 용암 · g 고스트 블록 · d 발사기 · s 슬라임 · z 좀비 · k 해골
  const FEATS = ['', '', 'h', 's', 'hs', 'c', 'cg', 'gz', 'cd', 'gdz', 'l', 'ld', 'lk', 'lgz', 'ldkz', 'gk', 'gds', 'lgzk', 'hcgldszk', 'hcgldszk'];
  const FEAT_INFO = { h: ['🧱', '장애물'], c: ['🌵', '선인장'], l: ['🔥', '용암'], g: ['👻', '고스트 블록'], d: ['🏹', '발사기'], s: ['🟢', '슬라임'], z: ['🧟', '좀비'], k: ['🦴', '해골'] };
  const themeOf = (lv) => THEMES[Math.min(3, Math.floor((lv - 1) / 5))];
  const parkourInfo = (lv) => ({ theme: themeOf(lv), feats: [...FEATS[lv - 1]].map((f) => FEAT_INFO[f]) });
  function seeded(seed) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function parkour(lv) {
    const R = seeded(lv * 7919 + 17), chance = (p) => R() < p, pick = (a) => a[Math.floor(R() * a.length)];
    const th = themeOf(lv), t = (lv - 1) / (PARKOUR_LEVELS - 1), feats = FEATS[lv - 1];
    const cells = [], mobs = [], items = [];
    const put = (x, y, z, id) => cells.push([x, y, z, id]);
    const rect = (x0, z0, w, d, y, id) => { for (let a = 0; a < w; a++) for (let b = 0; b < d; b++) put(x0 + a, y, z0 + b, id); };
    const food = (type, x, y, z) => items.push({ type, x, y, z });
    const jumps = 10 + Math.round(t * 16);           // 1단계 10번 → 20단계 26번
    const every = lv <= 10 ? 4 : 5;                    // 체크포인트 간격
    let y = 10, xc = 0, zEnd = 2, ghostK = 1, lastSpecial = -9, checks = 0, deck = [];
    rect(-1, 0, 3, 3, y, 'grass');                     // 출발 발판
    for (let i = 1; i <= jumps; i++) {
      // 앞 발판과의 빈칸: 1~3칸 (3칸은 달려서 뛰어야 한다). 올라갈 때는 2칸까지
      let gap = chance(0.3 + 0.35 * t) ? 2 : 1;
      if (gap === 2 && lv >= 8 && chance(0.25 * t)) gap = 3;
      const up = chance(0.12 + 0.18 * t), down = !up && chance(0.2);
      if (up) gap = Math.min(gap, 2);
      y = Math.max(7, Math.min(20, y + (up ? 1 : down ? -1 : 0)));
      if (gap < 3) xc += pick([-1, 0, 0, 1]);
      const zs = zEnd + 1 + gap;
      const mat = th.mats[(i + lv) % th.mats.length];
      const padW = lv <= 2 ? pick([2, 3]) : chance(0.75 - 0.5 * t) ? 2 : 1;
      const pad = (w = padW, id = mat) => { const x0 = xc - Math.floor((w - 1) / 2); rect(x0, zs, w, w, y, id); zEnd = zs + w - 1; return { x0, w }; };

      if (i % every === 0) { // 🚩 체크포인트 (음식이 놓여 있을 때가 있다)
        const p = pad(2, 'check');
        checks++;
        const type = lv >= 15 && checks % 2 === 0 ? 'steak' : lv >= 8 && checks % 2 === 0 ? 'bread' : checks % 2 ? 'apple' : null;
        if (type) food(type, p.x0 + 1, y + 1, zs + 1);
        continue;
      }
      // 특별한 발판: 그 레벨의 장애물·몹을 돌아가며 골고루 (한 가지만 몰리지 않게)
      let kind = 'pad';
      if (feats && i - lastSpecial >= (lv < 10 ? 2 : 1) && chance(0.35 + 0.3 * t)) {
        if (!deck.length) deck = [...feats].sort(() => R() - 0.5);
        kind = deck.pop();
      }
      if (kind !== 'pad') lastSpecial = i;
      if (kind === 'h') { // 🧱 장애물: 긴 발판 가운데 한 칸 높이 벽을 넘어간다 (사막은 선인장)
        const sw = lv < 10 ? 2 : 1, x0 = xc - (sw - 1);
        rect(x0, zs, sw, 4, y, mat);
        for (let a = 0; a < sw; a++) put(x0 + a, y + 1, zs + 2, th.bush);
        zEnd = zs + 3;
      } else if (kind === 'c') { // 🌵 선인장 발판: 가시를 피해서 내려앉는다
        const x0 = xc - 1;
        rect(x0, zs, 3, 3, y, 'sand');
        const spots = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => R() - 0.5).slice(0, lv >= 15 ? 4 : 3);
        spots.forEach((k) => { put(x0 + (k % 3), y + 1, zs + Math.floor(k / 3), 'cactus'); if (lv >= 12 && k === spots[0]) put(x0 + (k % 3), y + 2, zs + Math.floor(k / 3), 'cactus'); });
        zEnd = zs + 2;
      } else if (kind === 'l') { // 🔥 용암 웅덩이를 뛰어넘는다
        const sw = lv < 15 ? 2 : 1, x0 = xc - (sw - 1);
        for (let b = 0; b < 6; b++) for (let a = 0; a < sw; a++) {
          if (b === 2 || b === 3) { put(x0 + a, y, zs + b, 'lava'); put(x0 + a, y - 1, zs + b, mat); } else put(x0 + a, y, zs + b, mat);
        }
        zEnd = zs + 5;
      } else if (kind === 'g') { // 👻 고스트 블록: 1번·2번이 번갈아 나타난다 → 박자 맞춰 뛰기
        const n = 2 + (t > 0.5 ? 1 : 0);
        let z0 = zs;
        for (let k = 0; k < n; k++) {
          const w = lv < 12 ? 2 : pick([1, 2]), x0 = xc - Math.floor((w - 1) / 2);
          rect(x0, z0, w, w, y, ghostK === 1 ? 'ghost1' : 'ghost2');
          ghostK = 3 - ghostK;
          zEnd = z0 + w - 1;
          z0 = zEnd + 2;
        }
      } else if (kind === 'd') { // 🏹 발사기: 옆 기둥에서 화살이 날아온다
        pad();
        const sides = t > 0.8 ? [-1, 1] : [pick([-1, 1])];
        sides.forEach((side, k) => {
          const tx = xc + side * 4, tz = zs + k;
          for (let yy = y - 3; yy <= y; yy++) put(tx, yy, tz, 'cobble');
          put(tx, y + 1, tz, 'dispenser');
        });
      } else if (kind === 's' || kind === 'z') { // 🟢🧟 몹이 있는 넓은 발판: 밀려 떨어지지 않게 지나가거나 물리친다
        const A = lv >= 15 ? 5 : 4, x0 = xc - Math.floor(A / 2);
        rect(x0, zs, A, A, y, mat);
        const n = kind === 'z' ? (lv >= 18 ? 2 : 1) : lv >= 17 ? 3 : 2;
        for (let k = 0; k < n; k++) mobs.push({ type: kind === 'z' ? 'zombie' : 'slime', x: x0 + 1 + ((k * 2) % (A - 1)) + 0.5, y: y + 1, z: zs + A - 2 + 0.5 - (k % 2) });
        zEnd = zs + A - 1;
      } else if (kind === 'k') { // 🦴 해골: 옆 탑 위에서 활을 쏜다
        pad();
        const side = pick([-1, 1]), sx = xc + side * 5;
        for (let yy = y - 4; yy <= y + 1; yy++) put(sx, yy, zs, 'cobble');
        rect(sx - 1, zs, 2, 2, y + 2, mat);
        mobs.push({ type: 'skeleton', x: sx, y: y + 3, z: zs + 1 });
      } else {
        const p = pad();
        if (i % 6 === 3) food('apple', p.x0 + p.w / 2, y + 1, zs + p.w / 2);
      }
    }
    const gz = zEnd + 3;
    rect(xc - 1, gz, 3, 3, y, 'goal');
    // 크기 맞추기 (옆으로 3칸, 앞뒤로 2칸씩 여유)
    const xs = cells.map((c) => c[0]), minX = Math.min(...xs) - 3, W = Math.max(...xs) - minX + 4, H = 30, D = gz + 3 + 4;
    const m = blank(W, H, D);
    if (th.sea) for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) { m.set(x, 0, z, 'bedrock'); m.set(x, 1, z, 'lava'); } // 아래는 온통 용암 바다
    cells.forEach(([x, cy, z, id]) => m.set(x - minX, cy, z + 2, id));
    const mv = (e) => ({ ...e, x: e.x - minX, z: e.z + 2 });
    return { size: [W, H, D], data: m.data, spawn: [0.5 - minX, 11, 3.5], yaw: Math.PI, sky: th.sky, timer: true,
      mobs: mobs.map(mv), items: items.map(mv), fireEvery: 3.2 - 1.2 * t };
  }

  // 🌀 미로: 높은 울타리 벽 사이를 지나 도착 블록 찾기. 레벨이 오를수록 넓어진다
  const MAZE_LEVELS = 5;
  function maze(lv) {
    const n = 4 + lv * 2;                 // 방 개수 (가로·세로)
    const S = 2 * n + 1;                  // 블록 칸 수
    const open = Array.from({ length: S }, () => new Array(S).fill(false));
    // 길 파기: 아무 방에서 시작해 아직 안 간 옆방으로 벽을 허물며 간다
    const stack = [[0, 0]];
    const seen = new Set(['0,0']);
    open[1][1] = true;
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy, dx, dy])
        .filter(([x, y]) => x >= 0 && y >= 0 && x < n && y < n && !seen.has(x + ',' + y));
      if (!nb.length) { stack.pop(); continue; }
      const [x, y, dx, dy] = nb[Math.floor(Math.random() * nb.length)];
      open[2 * cx + 1 + dx][2 * cy + 1 + dy] = true;
      open[2 * x + 1][2 * y + 1] = true;
      seen.add(x + ',' + y);
      stack.push([x, y]);
    }
    const H = 6, wall = lv >= 4 ? 'stone' : 'leaves';
    const m = blank(S, H, S);
    for (let x = 0; x < S; x++) for (let z = 0; z < S; z++) {
      m.set(x, 0, z, 'grass');
      if (!open[x][z]) for (let y = 1; y <= 3; y++) m.set(x, y, z, wall);
    }
    m.set(S - 2, 0, S - 2, 'goal');
    const yaw = open[2][1] ? -Math.PI / 2 : Math.PI; // 처음에 열린 길 쪽을 바라보게
    return { size: [S, H, S], data: m.data, spawn: [1.5, 1, 1.5], yaw, sky: '#a8d8ff', timer: true };
  }

  // 출발 블록 위를 시작 위치로 (없으면 null)
  function startOf(size, data) {
    const [W, , D] = size, n = N('start');
    const i = data.indexOf(n);
    if (i < 0) return null;
    return [(i % W) + 0.5, Math.floor(i / (W * D)) + 1, (Math.floor(i / W) % D) + 0.5];
  }
  const unpack = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  // 맵 모양이 같은지 비교하는 짧은 지문 (올리기 전에 '만든 사람이 깼는지' 확인용)
  function fingerprint(data) { let h = 2166136261; for (let i = 0; i < data.length; i++) { h ^= data[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  const has = (data, id) => data.indexOf(N(id)) >= 0;

  return { myWorld, pack, unpack, parkour, parkourInfo, maze, startOf, fingerprint, has, MY, PARKOUR_LEVELS, MAZE_LEVELS };
})();

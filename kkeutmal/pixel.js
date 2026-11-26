// ===== 블록 세상 도트 그림 =====
// 머리·아이템: 8×8 점 그림. 글자 한 칸 = 점 하나, '.'은 빈칸. 글자마다 색은 팔레트로 정한다.
// 배경: 160×88 점짜리 블록 풍경을 코드로 그린다.
const Pix = (() => {
  const SHAPES = {
    slime: ['aaaaaaaa', 'abbbbbba', 'aeebbeea', 'aeebbeea', 'abbbbbba', 'abbmmbba', 'abbbbbba', 'aaaaaaaa'],
    zombie: ['hhhhhhhh', 'haaaaaah', 'aaaaaaaa', 'aeeaaeea', 'aaabbaaa', 'aammmmaa', 'aaaaaaaa', 'bbaaaabb'],
    skeleton: ['aaaaaaaa', 'abaaaaba', 'aeeaaeea', 'aeeaaeea', 'aaaeeaaa', 'abaaaaba', 'aememema', 'aaaaaaaa'],
    spider: ['aaaaaaaa', 'abaaaaba', 'aeeaaeea', 'aaxaaxaa', 'aaaaaaaa', 'abaaaaba', 'aabbbbaa', 'aaaaaaaa'],
    animal: ['hh....hh', 'haaaaaah', 'aaaaaaaa', 'aeaaaaea', 'aaaxxaaa', 'aaammaaa', 'abaaaaba', 'aaaaaaaa'],
    robot: ['xxxxxxxx', 'xaaaaaax', 'aeeaaeea', 'aeeaaeea', 'aaaaaaaa', 'ammmmmma', 'aaaaaaaa', 'bbbbbbbb'],
    ghost: ['.aaaaaa.', 'aaaaaaaa', 'aeeaaeea', 'aeeaaeea', 'aaaaaaaa', 'aaammaaa', 'aaaaaaaa', 'a.aa.aa.'],
    wizard: ['...hh...', '..hhhh..', '.hhhhhh.', 'xxxxxxxx', 'aeaaaaea', 'aaaaaaaa', 'abbmmbba', 'bbbbbbbb'],
    dragon: ['h.aaaa.h', 'haaaaaah', 'aeeaaeea', 'aaaaaaaa', 'abbbbbba', 'axbbbbxa', 'abbbbbba', 'aaaaaaaa'],
    golem: ['bbbbbbbb', 'baaaaaab', 'aaaaaaaa', 'beeaaeeb', 'aaaxxaaa', 'aaaxxaaa', 'abaaaaba', 'bbbbbbbb'],
    ninja: ['bbbbbbbb', 'bbbbbbbb', 'aaaaaaaa', 'beeaaeeb', 'bbbbbbbb', 'bbbbbbbb', 'bxbbbbxb', 'bbbbbbbb'],
    demon: ['h......h', 'hh....hh', 'aaaaaaaa', 'aeeaaeea', 'aaaaaaaa', 'amxmmxma', 'aaaaaaaa', 'bbbbbbbb'],
    king: ['x.x.x.x.', 'hxhhhhxh', 'hhhhhhhh', 'aaaaaaaa', 'aeeaaeea', 'aaaaaaaa', 'aabmmbaa', 'bbbbbbbb'],
    hero: ['hhhhhhhh', 'hhhhhhhh', 'haaaaaah', 'aweaaewa', 'aaaaaaaa', 'aaaxxaaa', 'aammmmaa', 'aaaaaaaa'],
    // 아이템
    potion: ['...bb...', '...ww...', '..wwww..', '.waaaaw.', '.awaaaa.', '.aaaaaa.', '..aaaa..', '........'],
    clock: ['..xxxx..', '.xaaaax.', 'xaaeaaax', 'xaaeaaax', 'xaaeeaax', 'xaaaaaax', '.xaaaax.', '..xxxx..'],
    chest: ['aaaaaaaa', 'abbbbbba', 'abbbbbba', 'aaaxxaaa', 'abbxxbba', 'abbbbbba', 'abbbbbba', 'aaaaaaaa'],
    book: ['.aaaaaa.', 'abbbbbba', 'abxxxxba', 'abbbbbba', 'abxxxxba', 'abbbbbba', 'abbbbbba', '.aaaaaa.'],
    gem: ['...aa...', '..abba..', '.abbbba.', 'abbwbbba', 'abbbbbba', '.abbbba.', '..abba..', '...aa...'],
    trophy: ['aaaaaaaa', 'abbbbbba', '.abbbba.', '..abba..', '...aa...', '...aa...', '..aaaa..', '.aaaaaa.'],
  };
  const cache = new Map();
  function url(shape, pal) {
    const key = shape + JSON.stringify(pal);
    if (cache.has(key)) return cache.get(key);
    const rows = SHAPES[shape];
    const cv = document.createElement('canvas');
    cv.width = 8; cv.height = 8;
    const g = cv.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.' || !pal[ch]) return;
      g.fillStyle = pal[ch];
      g.fillRect(x, y, 1, 1);
    }));
    const u = cv.toDataURL();
    cache.set(key, u);
    return u;
  }
  const img = (shape, pal, cls = '') => `<img class="px ${cls}" src="${url(shape, pal)}" alt="">`;

  // ----- 배경 풍경 -----
  // 같은 바이옴이면 늘 같은 그림이 나오도록 씨앗 있는 난수를 쓴다
  function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
  const W = 160, H = 88, B = 4; // 점 크기, 블록 한 칸 = 4점
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
  }
  // 블록 한 칸: 점마다 밝기를 조금씩 흔들어 블록 무늬를 낸다
  function block(g, bx, by, color, r) {
    for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) {
      g.fillStyle = shade(color, 0.85 + r() * 0.3);
      g.fillRect(bx * B + x, by * B + y, 1, 1);
    }
  }
  function scene(bm, seed) {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const r = rng(seed);
    const cols = W / B, rows = H / B;
    // 하늘: 위에서 아래로 계단처럼 밝아진다
    for (let y = 0; y < rows; y++) {
      const t = y / rows;
      g.fillStyle = mix(bm.sky[0], bm.sky[1], t);
      g.fillRect(0, y * B, W, B);
    }
    if (bm.stars) for (let i = 0; i < 40; i++) { g.fillStyle = '#fff'; g.fillRect(Math.floor(r() * W), Math.floor(r() * H * 0.6), 1, 1); }
    if (bm.sun) { g.fillStyle = bm.sun; g.fillRect(W - 34, 8, 12, 12); }
    if (bm.cloud) for (let i = 0; i < 4; i++) {
      const cx = Math.floor(r() * (cols - 6)), cy = 1 + Math.floor(r() * 4);
      for (let k = 0; k < 4 + Math.floor(r() * 3); k++) block(g, cx + k, cy, bm.cloud, r);
      for (let k = 1; k < 3; k++) block(g, cx + k, cy - 1, bm.cloud, r);
    }
    // 땅: 칸마다 높이가 한 칸씩 오르내린다
    let h = Math.floor(rows * (bm.base || 0.68));
    const heights = [];
    for (let x = 0; x < cols; x++) {
      if (r() < 0.3) h += r() < 0.5 ? -1 : 1;
      h = Math.max(Math.floor(rows * 0.55), Math.min(rows - 4, h));
      heights.push(h);
    }
    heights.forEach((top, x) => {
      for (let y = top; y < rows; y++) {
        let c = y === top ? bm.top : y < top + 3 ? bm.dirt : bm.stone;
        if (y > top + 3 && bm.ore && r() < 0.06) c = bm.ore[Math.floor(r() * bm.ore.length)];
        block(g, x, y, c, r);
      }
      if (bm.water && top > bm.water) for (let y = bm.water; y < top; y++) block(g, x, y, '#3f76e4', r);
      if (bm.lava && top > bm.lava) for (let y = bm.lava; y < top; y++) block(g, x, y, '#ff7a1a', r);
    });
    // 장식: 나무·선인장·수정 등
    for (let x = 2; x < cols - 2; x++) {
      if (r() > bm.decoRate) continue;
      const top = heights[x];
      if (bm.water && top > bm.water) continue;
      if (bm.lava && top > bm.lava) continue;
      bm.deco(g, x, top, r);
      x += 3;
    }
    if (bm.ceiling) for (let x = 0; x < cols; x++) {
      const d = 2 + Math.floor(r() * 3);
      for (let y = 0; y < d; y++) block(g, x, y, bm.stone, r);
    }
    return cv.toDataURL();
  }
  function mix(a, b, t) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [x, y] = [p(a), p(b)];
    return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
  }
  const tree = (g, x, top, r) => {
    for (let k = 1; k <= 3; k++) block(g, x, top - k, '#6b4a2b', r);
    for (let dx = -2; dx <= 2; dx++) for (let dy = 4; dy <= 5; dy++) block(g, x + dx, top - dy, '#3f8a2a', r);
    for (let dx = -1; dx <= 1; dx++) block(g, x + dx, top - 6, '#3f8a2a', r);
  };
  const cactus = (g, x, top, r) => { const n = 2 + Math.floor(r() * 3); for (let k = 1; k <= n; k++) block(g, x, top - k, '#4c8a2e', r); };
  const torch = (g, x, top, r) => { block(g, x, top - 1, '#6b4a2b', r); block(g, x, top - 2, '#ffcf3f', r); };
  const kelp = (g, x, top, r) => { for (let k = 1; k <= 2 + Math.floor(r() * 3); k++) block(g, x, top - k, '#2f8a4a', r); };
  const fire = (g, x, top, r) => { block(g, x, top - 1, '#ff9a2a', r); if (r() < 0.5) block(g, x, top - 2, '#ffd23f', r); };
  const crystal = (g, x, top, r) => { const n = 2 + Math.floor(r() * 4); for (let k = 1; k <= n; k++) block(g, x, top - k, '#b06cff', r); };

  const BIOMES = [
    { sky: ['#6fb6ff', '#cfeaff'], sun: '#fff27a', cloud: '#ffffff', top: '#5fae3c', dirt: '#8a5a32', stone: '#7d7d7d', deco: tree, decoRate: 0.25 },
    { sky: ['#15131a', '#2c2833'], ceiling: true, top: '#6e6e6e', dirt: '#5d5d5d', stone: '#4d4d4d', ore: ['#5ee0e0', '#e0c060', '#d04040'], deco: torch, decoRate: 0.2 },
    { sky: ['#4aa0ff', '#bfe6ff'], sun: '#fff27a', cloud: '#ffffff', top: '#e6d48f', dirt: '#d8c27a', stone: '#7d7d7d', water: 14, base: 0.8, deco: kelp, decoRate: 0.3 },
    { sky: ['#ffbe6a', '#ffeec4'], sun: '#fff8c0', top: '#ecd48a', dirt: '#dcc27a', stone: '#b89a5a', deco: cactus, decoRate: 0.25 },
    { sky: ['#2a0606', '#6a1a10'], ceiling: true, top: '#8a2c24', dirt: '#702420', stone: '#5a1c18', lava: 16, deco: fire, decoRate: 0.25 },
    { sky: ['#0a0620', '#2a1a50'], stars: true, top: '#e3e0a6', dirt: '#d6d29a', stone: '#c4c08a', deco: crystal, decoRate: 0.3 },
  ];
  const sceneCache = {};
  const background = (i) => (sceneCache[i] ||= scene(BIOMES[i], 1234 + i * 777));

  return { img, url, background };
})();

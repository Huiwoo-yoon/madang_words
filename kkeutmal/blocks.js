// ===== 블록 종류와 무늬 (타자연습 type_v2/art.js의 블록 그림을 그대로 가져옴) =====
// 블록 id는 타자연습과 같게 둔다 (나중에 합칠 때 그대로 옮겨 오려고).
// 3D 세계는 블록을 번호(BLOCKS 안의 순서 + 1)로 저장하므로, 새 블록은 꼭 맨 뒤에만 붙인다.
const Blocks = (() => {
  function seeded(seed) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function pixelArt(painter, seed = 1) {
    const rnd = seeded(seed);
    const rp = (arr) => (typeof arr === 'string' ? arr : arr[Math.floor(rnd() * arr.length)]);
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const g = c.getContext('2d');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const col = painter(x, y, rnd);
      if (col) { g.fillStyle = rp(col); g.fillRect(x, y, 1, 1); }
    }
    return c;
  }
  const STONE = ['#7f7f7f', '#747474', '#8c8c8c', '#6a6a6a'];
  const DIRT = ['#866043', '#79553a', '#96704f'];
  const GRASS = ['#5da130', '#4c8a24', '#6fbf3a'];
  function ore(colors, seed) {
    const rnd = seeded(seed * 7);
    const spots = new Set();
    for (let k = 0; k < 5; k++) {
      const cx = 2 + Math.floor(rnd() * 12), cy = 2 + Math.floor(rnd() * 12);
      [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0]].forEach(([dx, dy]) => rnd() < 0.8 && spots.add(cx + dx + ',' + (cy + dy)));
    }
    return (x, y) => (spots.has(x + ',' + y) ? colors : STONE);
  }

  // tier: 1~4 = 얼마나 귀한지 (값과 얻는 방법이 달라진다), 0 = 장식, -1 = 맵 전용(살 수 없음)
  const LIST = [
    { id: 'grass', name: '잔디', tier: 1, paint: (x, y, r) => (y < 3 || (y === 3 && r() < 0.5) ? GRASS : DIRT), top: () => GRASS, bottom: () => DIRT },
    { id: 'dirt', name: '흙', tier: 1, paint: () => DIRT },
    { id: 'log', name: '나무', tier: 1, paint: (x) => (x % 4 === 0 || x % 4 === 3 ? '#4f3a24' : ['#6b5033', '#76593a']),
      top: (x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); return d > 6.5 ? '#4f3a24' : Math.floor(d) % 2 ? '#a8864f' : '#8a6a3a'; } },
    { id: 'leaves', name: '나뭇잎', tier: 1, paint: (x, y, r) => (r() < 0.15 ? '#1f4f14' : ['#3f8a2a', '#4f9a32', '#357a22']) },
    { id: 'stone', name: '돌', tier: 2, paint: () => STONE },
    { id: 'cobble', name: '조약돌', tier: 2, paint: (x, y, r) => ((x + y * 3) % 5 === 0 || r() < 0.2 ? '#555' : ['#8a8a8a', '#7a7a7a', '#9a9a9a']) },
    { id: 'sand', name: '모래', tier: 2, paint: () => ['#dbd3a0', '#d4cb93', '#e3dbab'] },
    { id: 'coal', name: '석탄', tier: 2, ore: ['#1c1c1c', '#333'] },
    { id: 'planks', name: '나무판자', tier: 3, paint: (x, y) => (y % 4 === 3 || (x + (Math.floor(y / 4) % 2) * 8) % 16 === 0 ? '#6e5230' : ['#a8864f', '#b08e56', '#9c7b47']) },
    { id: 'brick', name: '벽돌', tier: 3, paint: (x, y) => (y % 4 === 3 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0 ? '#bdb3aa' : ['#9c4a36', '#8a3f2e', '#a8533c']) },
    { id: 'iron', name: '철', tier: 3, ore: ['#d8af93', '#c49a7e', '#e6c6ae'] },
    { id: 'gold', name: '금', tier: 3, ore: ['#fce34a', '#f5c02a'] },
    { id: 'diamond', name: '다이아몬드', tier: 4, ore: ['#5decf5', '#2cc5cf', '#b5fcff'] },
    { id: 'emerald', name: '에메랄드', tier: 4, ore: ['#17dd62', '#0aa84a'] },
    { id: 'lapis', name: '청금석', tier: 4, ore: ['#1f4fc8', '#2a5fe0'] },
    { id: 'glass', name: '유리', tier: 4, see: true,
      paint: (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? '#dbeff5' : (x - y === 2 || x - y === 3) && x > 3 && x < 13 ? '#ffffff' : null) },
    { id: 'crafting_table', name: '작업대', tier: 0, paint: (x, y) => (x === 0 || x === 15 || y === 0 || y === 15 ? '#4a3118'
      : y <= 6 ? (x === 5 || x === 10 || y === 3 ? '#6b4a25' : '#c9a063') : x === 7 || x === 8 ? '#6e5230' : ['#a8864f', '#9c7b47']) },
    { id: 'torch', name: '횃불', tier: 0, see: true, paint: (x, y) => ((x === 7 || x === 8) && y >= 6 && y <= 14 ? ['#7a5230', '#6b4423']
      : y === 2 && (x === 7 || x === 8) ? '#ffd23f' : (y === 3 || y === 4) && x >= 6 && x <= 9 ? ['#ff9a1f', '#ffd23f'] : y === 5 && (x === 7 || x === 8) ? '#ff7a1f' : null) },
    { id: 'door', name: '문', tier: 0, see: true, paint: (x, y) => (x < 3 || x > 12 || y === 0 ? null : x === 3 || x === 12 || y === 1 ? '#4a3118'
      : x === 10 && y === 8 ? '#ffd23f' : y === 5 || y === 10 ? '#6e5230' : ['#9c7b47', '#a8864f']) },
    { id: 'bed', name: '침대', tier: 0, see: true, paint: (x, y) => (x === 0 && y >= 4 ? '#6e5230' : y >= 12 && (x <= 1 || x >= 14) ? '#4a3118'
      : y >= 9 && y <= 11 ? ['#a8864f', '#9c7b47'] : y >= 5 && y <= 8 ? (x >= 1 && x <= 4 ? ['#f4f4f4', '#e6e6e6'] : ['#c0392b', '#b03024']) : null) },
    { id: 'chest', name: '상자', tier: 0, paint: (x, y) => (x === 0 || x === 15 || y === 0 || y === 15 ? '#3a2410'
      : x >= 7 && x <= 8 && y >= 5 && y <= 8 ? '#d8d8d8' : y === 6 || y === 7 ? '#6e4520' : ['#a8742c', '#9c6a28']) },
    { id: 'fence', name: '울타리', tier: 0, see: true, paint: (x, y) => ((x === 3 || x === 4 || x === 11 || x === 12) && y >= 1 ? '#9c7b47'
      : x >= 5 && x <= 10 && (y === 4 || y === 5 || y === 9 || y === 10) ? '#b08e56' : null) },
    { id: 'furnace', name: '화로', tier: 0, paint: (x, y) => (x === 0 || x === 15 || y === 0 || y === 15 ? '#555555'
      : x >= 6 && x <= 9 && y >= 11 && y <= 13 ? ['#ff9a1f', '#ffd23f']
      : (x >= 4 && x <= 11 && y >= 8 && y <= 13) || (x >= 5 && x <= 10 && y >= 3 && y <= 4) ? '#1a1a1a' : ['#8a8a8a', '#7a7a7a', '#9a9a9a']) },
    // 맵 도구 (tool): 내 세계에서는 공짜로 마음껏 놓아 파쿠르·미로를 만든다. 체크포인트 = 밟으면 여기서 다시 시작
    { id: 'check', name: '체크포인트', tier: -1, tool: true, paint: (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? '#8a6a10' : (x + y) % 4 < 2 ? '#ffd23f' : '#f5c02a') },
    { id: 'goal', name: '도착', tier: -1, tool: true, paint: (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? '#0a6a3a'
      : Math.abs(x - 7.5) + Math.abs(y - 7.5) < 5 ? ['#ffffff', '#c8ffd8'] : ['#17dd62', '#2ae07a']) },
    { id: 'bedrock', name: '기반암', tier: -1, paint: (x, y, r) => (r() < 0.35 ? '#2a2a2a' : ['#555', '#444', '#666']) },
    // 출발 블록: 맵을 시작하는 곳 (한 세계에 하나)
    { id: 'start', name: '출발', tier: -1, tool: true, paint: (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? '#1a3a8a'
      : (y >= 7 && y <= 8 && x >= 3 && x <= 12) || (Math.abs(x - 10) + Math.abs(y - 7.5) < 4 && x >= 8) ? '#ffffff' : ['#3a7ad0', '#4a8ae0']) },
  ];
  const PRICE = { 1: 20, 2: 40, 3: 80, 4: 200, 0: 150 };

  // 텍스처 모음(아틀라스): 16×16 칸을 8개씩 줄 세운 그림 한 장
  const COLS = 8;
  const tiles = [];
  const addTile = (canvas) => { tiles.push(canvas); return tiles.length - 1; };
  const BY_ID = {}, BY_NUM = [null];
  LIST.forEach((b, i) => {
    const paint = b.ore ? ore(b.ore, i + 1) : b.paint;
    b.num = i + 1;
    b.canvas = pixelArt(paint, i + 1);
    b.url = b.canvas.toDataURL();
    b.price = PRICE[b.tier];
    const side = addTile(b.canvas);
    b.tile = { side, top: b.top ? addTile(pixelArt(b.top, i + 100)) : side, bottom: b.bottom ? addTile(pixelArt(b.bottom, i + 200)) : side };
    BY_ID[b.id] = b;
    BY_NUM[b.num] = b;
  });
  const ROWS = Math.ceil(tiles.length / COLS);
  const atlas = document.createElement('canvas');
  atlas.width = COLS * 16; atlas.height = ROWS * 16;
  tiles.forEach((t, k) => atlas.getContext('2d').drawImage(t, (k % COLS) * 16, Math.floor(k / COLS) * 16));

  const ofTier = (t) => LIST.filter((b) => b.tier === t);
  const randomOfTier = (t) => { const l = ofTier(t); return l[Math.floor(Math.random() * l.length)]; };
  const icon = (b) => `<img class="px blk" src="${b.url}" alt="${b.name}">`;

  return { LIST, BY_ID, BY_NUM, atlas, COLS, ROWS, ofTier, randomOfTier, icon };
})();

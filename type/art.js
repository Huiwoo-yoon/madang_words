// ===== 픽셀 아트: 블록 텍스처, 캐릭터 얼굴, 곡괭이 (모두 캔버스로 그림) =====
function seeded(seed) { // 매번 같은 무늬가 나오도록 시드 난수 사용
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function pixelArt(size, painter, seed = 1) {
  const rnd = seeded(seed);
  const rp = arr => typeof arr === 'string' ? arr : arr[Math.floor(rnd() * arr.length)];
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const col = painter(x, y, rnd, rp);
    if (col) { g.fillStyle = rp(col); g.fillRect(x, y, 1, 1); }
  }
  return c;
}

// ----- 블록 -----
const STONE = ['#7f7f7f', '#747474', '#8c8c8c', '#6a6a6a'];
const DIRT = ['#866043', '#79553a', '#96704f'];
const GRASS = ['#5da130', '#4c8a24', '#6fbf3a'];
function oreCanvas(colors, seed) {
  const rnd = seeded(seed * 7);
  const spots = new Set();
  for (let k = 0; k < 5; k++) {
    const cx = 2 + Math.floor(rnd() * 12), cy = 2 + Math.floor(rnd() * 12);
    [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0]].forEach(([dx, dy]) => rnd() < .8 && spots.add((cx + dx) + ',' + (cy + dy)));
  }
  return pixelArt(16, (x, y) => spots.has(x + ',' + y) ? colors : STONE, seed);
}
// lvl: 몇 번째 난이도에서 캘 수 있는 블록인지
const BLOCKS = [
  { id: 'grass', name: '잔디', lvl: 1, paint: (x, y, r) => y < 3 || (y === 3 && r() < .5) ? GRASS : DIRT },
  { id: 'dirt', name: '흙', lvl: 1, paint: () => DIRT },
  { id: 'log', name: '나무', lvl: 1, paint: x => x % 4 === 0 || x % 4 === 3 ? '#4f3a24' : ['#6b5033', '#76593a'] },
  { id: 'leaves', name: '나뭇잎', lvl: 1, paint: (x, y, r) => r() < .15 ? '#1f4f14' : ['#3f8a2a', '#4f9a32', '#357a22'] },
  { id: 'stone', name: '돌', lvl: 2, paint: () => STONE },
  { id: 'cobble', name: '조약돌', lvl: 2, paint: (x, y, r) => (x + y * 3) % 5 === 0 || r() < .2 ? '#555' : ['#8a8a8a', '#7a7a7a', '#9a9a9a'] },
  { id: 'sand', name: '모래', lvl: 2, paint: () => ['#dbd3a0', '#d4cb93', '#e3dbab'] },
  { id: 'coal', name: '석탄', lvl: 2, ore: ['#1c1c1c', '#333'] },
  { id: 'planks', name: '나무판자', lvl: 3, paint: (x, y) => y % 4 === 3 || (x + (Math.floor(y / 4) % 2) * 8) % 16 === 0 ? '#6e5230' : ['#a8864f', '#b08e56', '#9c7b47'] },
  { id: 'brick', name: '벽돌', lvl: 3, paint: (x, y) => y % 4 === 3 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0 ? '#bdb3aa' : ['#9c4a36', '#8a3f2e', '#a8533c'] },
  { id: 'iron', name: '철', lvl: 3, ore: ['#d8af93', '#c49a7e', '#e6c6ae'] },
  { id: 'gold', name: '금', lvl: 3, ore: ['#fce34a', '#f5c02a'] },
  { id: 'diamond', name: '다이아몬드', lvl: 4, ore: ['#5decf5', '#2cc5cf', '#b5fcff'] },
  { id: 'emerald', name: '에메랄드', lvl: 4, ore: ['#17dd62', '#0aa84a'] },
  { id: 'lapis', name: '청금석', lvl: 4, ore: ['#1f4fc8', '#2a5fe0'] },
  { id: 'glass', name: '유리', lvl: 4, paint: (x, y) => x === 0 || y === 0 || x === 15 || y === 15 ? '#dbeff5' : (x - y === 2 || x - y === 3) && x > 3 && x < 13 ? '#ffffff' : 'rgba(200,235,245,.25)' },
  // lvl 0: 타자로는 안 나오고 🛠️ 작업대에서만 만들 수 있는 가구·장식 (투명한 곳이 있어서 하늘이 비쳐 보임)
  { id: 'crafting_table', name: '작업대', lvl: 0, paint: (x, y) => x === 0 || x === 15 || y === 0 || y === 15 ? '#4a3118'
      : y <= 6 ? (x === 5 || x === 10 || y === 3 ? '#6b4a25' : '#c9a063')
      : (x >= 2 && x <= 5 && y === 9) || (x === 3 && y === 10) ? '#c8c8c8'
      : (x >= 10 && x <= 12 && y === 8) ? '#9a9a9a' : x === 11 && y >= 9 && y <= 12 ? '#6e4520'
      : (x === 7 || x === 8) ? '#6e5230' : ['#a8864f', '#9c7b47'] },
  { id: 'torch', name: '횃불', lvl: 0, paint: (x, y) => (x === 7 || x === 8) && y >= 6 && y <= 14 ? ['#7a5230', '#6b4423']
      : y === 2 && (x === 7 || x === 8) ? '#ffd23f'
      : (y === 3 || y === 4) && x >= 6 && x <= 9 ? ['#ff9a1f', '#ffd23f'] : y === 5 && (x === 7 || x === 8) ? '#ff7a1f' : null },
  { id: 'door', name: '문', lvl: 0, paint: (x, y) => x < 3 || x > 12 || y === 0 ? null
      : x === 3 || x === 12 || y === 1 ? '#4a3118' : x === 10 && y === 8 ? '#ffd23f'
      : y === 5 || y === 10 ? '#6e5230' : ['#9c7b47', '#a8864f'] },
  { id: 'bed', name: '침대', lvl: 0, paint: (x, y) => x === 0 && y >= 4 ? '#6e5230'
      : y >= 12 && (x <= 1 || x >= 14) ? '#4a3118' : y >= 9 && y <= 11 ? ['#a8864f', '#9c7b47']
      : y >= 5 && y <= 8 ? (x >= 1 && x <= 4 ? ['#f4f4f4', '#e6e6e6'] : ['#c0392b', '#b03024']) : null },
  { id: 'chest', name: '상자', lvl: 0, paint: (x, y) => x === 0 || x === 15 || y === 0 || y === 15 ? '#3a2410'
      : x >= 7 && x <= 8 && y >= 5 && y <= 8 ? '#d8d8d8' : y === 6 || y === 7 ? '#6e4520' : ['#a8742c', '#9c6a28'] },
  { id: 'fence', name: '울타리', lvl: 0, paint: (x, y) => (x === 3 || x === 4 || x === 11 || x === 12) && y >= 1 ? '#9c7b47'
      : x >= 5 && x <= 10 && (y === 4 || y === 5 || y === 9 || y === 10) ? '#b08e56' : null },
  { id: 'furnace', name: '화로', lvl: 0, paint: (x, y) => x === 0 || x === 15 || y === 0 || y === 15 ? '#555555'
      : x >= 6 && x <= 9 && y >= 11 && y <= 13 ? ['#ff9a1f', '#ffd23f']
      : (x >= 4 && x <= 11 && y >= 8 && y <= 13) || (x >= 5 && x <= 10 && y >= 3 && y <= 4) ? '#1a1a1a' : ['#8a8a8a', '#7a7a7a', '#9a9a9a'] },
];
const BLOCK = {};
BLOCKS.forEach((b, i) => {
  b.canvas = b.ore ? oreCanvas(b.ore, i + 1) : pixelArt(16, b.paint, i + 1);
  b.url = b.canvas.toDataURL();
  const d = b.canvas.getContext('2d').getImageData(0, 0, 16, 16).data;
  const solid = []; // 파편 색: 투명하지 않은 픽셀에서 골고루
  for (let k = 0; k < 256; k++) if (d[k * 4 + 3] > 100) solid.push(`rgb(${d[k * 4]},${d[k * 4 + 1]},${d[k * 4 + 2]})`);
  b.colors = [0, .25, .5, .75, .99].map(f => solid[Math.floor(solid.length * f)]);
  BLOCK[b.id] = b;
});

const CRACK = (() => {
  const px = new Set();
  const r = seeded(99);
  for (let k = 0; k < 4; k++) {
    let x = 8, y = 8;
    for (let s = 0; s < 9; s++) {
      px.add(x + ',' + y);
      x = Math.max(0, Math.min(15, x + Math.floor(r() * 3) - 1 + (k % 2 ? 1 : -1) * (s % 2)));
      y = Math.max(0, Math.min(15, y + Math.floor(r() * 3) - 1 + (k < 2 ? 1 : -1) * (s % 2)));
    }
  }
  return pixelArt(16, (x, y) => px.has(x + ',' + y) ? 'rgba(0,0,0,.85)' : null).toDataURL();
})();

// ----- 캐릭터 -----
const CHARS = {
  steve: {
    name: '스티브', shirt: '#00a8a8', pants: '#3b3bb0', hand: '#c6906b',
    face: ['HHHHHHHH', 'HHHHHHHH', 'HSSSSSSH', 'SSSSSSSS', 'SWBSSBWS', 'SSSNNSSS', 'SSMSSMSS', 'SSMMMMSS'],
    pal: { H: ['#3a2615', '#2e1d0f'], S: ['#c6906b', '#bd8a62'], W: '#fff', B: '#4b3a9c', N: '#8a5a3c', M: '#6b3a25' },
  },
  alex: {
    name: '알렉스', shirt: '#6fae5a', pants: '#6b4a2b', hand: '#f2c9a0',
    face: ['HHHHHHHH', 'HHHHHHHH', 'HHSSSSSH', 'HSSSSSSH', 'SWGSSGWH', 'SSSSSSSH', 'SSSMMSSH', 'SSSSSSSS'],
    pal: { H: ['#e07b24', '#d0691a'], S: ['#f2c9a0', '#ebbf94'], W: '#fff', G: '#3a8a3a', M: '#c26a50' },
  },
  creeper: {
    name: '크리퍼', shirt: '#5dbb4a', pants: '#3f8f33', hand: '#5dbb4a',
    face: ['........', '........', '.XX..XX.', '.XX..XX.', '...XX...', '..XXXX..', '..XXXX..', '..X..X..'],
    pal: { '.': ['#5dbb4a', '#4ea03e', '#76d15f', '#3f8f33'], X: '#111' },
  },
  zombie: {
    name: '좀비', shirt: '#00a8a8', pants: '#3b3bb0', hand: '#5b9b44',
    face: ['HHHHHHHH', 'HHHHHHHH', 'HZZZZZZH', 'ZZZZZZZZ', 'ZKKZZKKZ', 'ZZZNNZZZ', 'ZZMMMMZZ', 'ZZZZZZZZ'],
    pal: { H: ['#2b4a28', '#233d21'], Z: ['#5b9b44', '#4f8a3a', '#62a64b'], K: '#0f0f0f', N: '#3f6f30', M: '#2f4f25' },
  },
  skeleton: {
    name: '스켈레톤', shirt: '#c8c8c8', pants: '#9a9a9a', hand: '#c8c8c8',
    face: ['WWWWWWWW', 'WWWWWWWW', 'WWWWWWWW', 'WWWWWWWW', 'WKKWWKKW', 'WWWKKWWW', 'WKKKKKKW', 'WWWWWWWW'],
    pal: { W: ['#c8c8c8', '#bdbdbd', '#d4d4d4'], K: '#3a3a3a' },
  },
  enderman: {
    name: '엔더맨', shirt: '#161616', pants: '#161616', hand: '#161616',
    face: ['BBBBBBBB', 'BBBBBBBB', 'BBBBBBBB', 'BBBBBBBB', 'PQPBBPQP', 'BBBBBBBB', 'BBBBBBBB', 'BBBBBBBB'],
    pal: { B: ['#161616', '#1c1c1c', '#101010'], P: '#e079fa', Q: '#cc00fa' },
  },
  pig: {
    name: '돼지', shirt: '#f0a8a8', pants: '#e59a9a', hand: '#f0a8a8',
    face: ['PPPPPPPP', 'PPPPPPPP', 'PPPPPPPP', 'PWKPPKWP', 'PPPPPPPP', 'PPSSSSPP', 'PPNSSNPP', 'PPSSSSPP'],
    pal: { P: ['#f0a8a8', '#eca0a0', '#f4b2b2'], W: '#fff', K: '#1a1a1a', S: '#e07f86', N: '#9a4a4a' },
  },
  villager: {
    name: '주민', shirt: '#6b4a2f', pants: '#5a3e27', hand: '#b4846a',
    face: ['UUUUUUUU', 'UUUUUUUU', 'SSSSSSSS', 'SUUUUUUS', 'SWGSSGWS', 'SSSNNSSS', 'SSSNNSSS', 'SSSNNSSS'],
    pal: { U: '#4a3222', S: ['#b4846a', '#ab7d62'], W: '#fff', G: '#2e8a3a', N: '#9a6a50' },
  },
};
Object.values(CHARS).forEach((c, i) => {
  c.faceUrl = pixelArt(8, (x, y) => c.pal[c.face[y][x]], i + 10).toDataURL();
});

// 곡괭이: 왼쪽 아래가 손잡이 끝, 오른쪽 위로 뻗은 자루 + 활 모양 날
const PICKAXES = [
  { name: '나무 곡괭이', head: ['#b08e56', '#a8864f'] },
  { name: '돌 곡괭이', head: ['#8c8c8c', '#747474'] },
  { name: '철 곡괭이', head: ['#e6e6e6', '#c4c4c4'] },
  { name: '다이아 곡괭이', head: ['#5decf5', '#2cc5cf'] },
].map(t => ({ ...t, url: pixelArt(16, (x, y) => {
  const d = Math.hypot(x - 1, y - 14);
  const ang = Math.atan2(14 - y, x - 1) * 180 / Math.PI;
  if (d >= 11.5 && d <= 13.6 && ang > 8 && ang < 82) return t.head;
  if (Math.abs(x + y - 15) <= 0.5 && x >= 1 && x <= 9) return ['#8a5a2c', '#6e4520'];
  return null;
}).toDataURL() }));

// ----- 바이옴 (만들기 화면의 배경과 땅) -----
const GROUNDS = {
  grass: BLOCK.grass.canvas,
  sand: BLOCK.sand.canvas,
  snow: pixelArt(16, (x, y, r) => y < 4 || (y === 4 && r() < .5) ? ['#ffffff', '#f0f6fa', '#e6eef5'] : DIRT, 50),
  netherrack: pixelArt(16, (x, y, r) => r() < .2 ? '#5a1a1a' : ['#7a2a2a', '#6b2222', '#8a3030'], 51),
  endstone: pixelArt(16, (x, y, r) => r() < .15 ? '#c9c48a' : ['#e0dca0', '#d8d496', '#ebe7b0'], 52),
};
// deco: 하늘에 그리는 장식 (sun=해, clouds=구름, snow=눈송이, embers=불씨, stars=별)
const BIOMES = {
  plains: { name: '🌳 평원', sky: ['#6fb2ff', '#bfe0ff'], ground: 'grass', deco: ['sun', 'clouds'] },
  desert: { name: '🏜️ 사막', sky: ['#5fa8f0', '#cfe6f7'], ground: 'sand', deco: ['sun'] },
  snow: { name: '❄️ 설원', sky: ['#a9c7e0', '#eef5fb'], ground: 'snow', deco: ['clouds', 'snow'] },
  nether: { name: '🔥 네더', sky: ['#2a0606', '#8a2a10'], ground: 'netherrack', deco: ['embers'] },
  end: { name: '🌌 엔드', sky: ['#07040f', '#2a1a40'], ground: 'endstone', deco: ['stars'] },
};

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

  // 🏃 파쿠르: 허공에 떠 있는 발판을 뛰어서 건너 도착 블록까지. 레벨이 오를수록 길고, 멀고, 발판이 작다
  const PARKOUR_LEVELS = 5;
  function parkour(lv) {
    const jumps = 8 + lv * 4;
    const mats = ['stone', 'planks', 'leaves', 'brick', 'cobble', 'sand', 'lapis', 'iron'];
    const pads = [{ x: 0, y: 10, z: 0, w: 3, id: 'grass' }]; // w = 발판 한 변 크기
    let x = 0, y = 10, z = 0;
    for (let i = 1; i <= jumps; i++) {
      const up = Math.random() < (lv === 1 ? 0.15 : 0.3);
      const down = !up && Math.random() < 0.25;
      // 칸 사이 거리: 2(한 칸 띄움) ~ 4(세 칸 띄움, 달려야 닿음). 올라갈 때는 가깝게
      let dz = 2 + Math.floor(Math.random() * (lv >= 3 ? 2 : 1)) + (Math.random() < 0.4 ? 1 : 0);
      if (lv >= 4 && !up && Math.random() < 0.3) dz = 4;
      if (up) dz = Math.min(dz, 3);
      const dx = up ? 0 : Math.floor(Math.random() * 3) - 1;
      const w = lv === 1 ? 2 : lv <= 3 && Math.random() < 0.5 ? 2 : 1;
      x += dx; z += dz + (pads[pads.length - 1].w - 1); y = Math.max(4, Math.min(22, y + (up ? 1 : down ? -1 : 0)));
      const isCheck = i % 6 === 0 && i < jumps;
      pads.push({ x, y, z, w: isCheck ? 2 : w, id: isCheck ? 'check' : mats[(i + lv) % mats.length] });
    }
    z += 3;
    pads.push({ x: x - 1, y, z, w: 3, id: 'goal' });
    // 크기 맞추기
    const minX = Math.min(...pads.map((p) => p.x)) - 4, maxX = Math.max(...pads.map((p) => p.x + p.w)) + 4;
    const W = maxX - minX, H = 30, D = z + 8;
    const m = blank(W, H, D);
    pads.forEach((p) => { for (let a = 0; a < p.w; a++) for (let b = 0; b < p.w; b++) m.set(p.x - minX + a, p.y, p.z + 2 + b, p.id); });
    const s = pads[0];
    return { size: [W, H, D], data: m.data, spawn: [s.x - minX + 1.5, s.y + 1, s.z + 2 + 1.5], yaw: Math.PI, sky: '#9fd4ff', timer: true };
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

  return { myWorld, pack, unpack, parkour, maze, startOf, fingerprint, has, MY, PARKOUR_LEVELS, MAZE_LEVELS };
})();

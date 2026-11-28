// ===== 3D 블록 세상 (Three.js) =====
// 1인칭으로 걷고(WASD), 뛰고(스페이스), 마우스로 둘러보고, 블록을 놓고(오른쪽 클릭) 부순다(왼쪽 클릭).
// 건축 모드: 놓기·부수기·날기(F) 가능 / 모험 모드: 걷기만 (부수기·놓기 안 됨)
// 모험 모드에서는 마인크래프트처럼 체력(하트 10개)과 배고픔(고기 10개)이 있다.
//   떨어지면 다치고, 용암·선인장·화살·몹에 다치고, 배고픔이 0이면 체력이 준다. 배가 부르면 체력이 찬다.
//   체력이 0이 되거나 아래로 떨어지면 = 실패 1번 → 체크포인트에서 다시 (체력·배고픔 가득)
// 쓰는 법: World3D.open({ size:[W,H,D], data, mode, canSwitch, tools, spawn, sky, inv, food, mobs, items, fireEvery,
//                         onSave, onGoal(ms, fails), onExit })
//   tools: 내 세계처럼 맵 도구(출발·체크포인트·도착 블록)를 공짜로 놓을 수 있는지
//   food: 음식 가방 {apple, bread, steak} (먹으면 줄고, 맵에서 주우면 는다)
//   mobs: [{type:'zombie'|'slime'|'skeleton', x, y, z}], items: [{type:'apple'|'bread'|'steak', x, y, z}]
const World3D = (() => {
  const GRAVITY = 28, JUMP = 9, WALK = 4.3, RUN = 6, FLY = 9, REACH = 6, HIT_REACH = 3.5;
  const HALF = 0.3, HEIGHT = 1.8, EYE = 1.6;
  const MAX_HP = 20, MAX_FOOD = 20;
  const FOODS = {
    apple: { name: '사과', icon: '🍎', food: 4 },
    bread: { name: '빵', icon: '🍞', food: 5 },
    steak: { name: '스테이크', icon: '🥩', food: 8 },
  };
  const MOBS = {
    zombie: { name: '좀비', hp: 12, half: 0.3, h: 1.9, speed: 2.1, dmg: 3, push: 5, voice: 'zombie' },
    slime: { name: '슬라임', hp: 8, half: 0.45, h: 0.9, dmg: 2, push: 4, voice: 'slime' },
    skeleton: { name: '해골', hp: 8, half: 0.3, h: 1.9, dmg: 0, voice: 'skeleton', shoot: 2.6 },
  };
  const DEATH = { fall: '쿵! 너무 높은 데서 떨어졌어요', lava: '🔥 용암에 빠졌어요', fire: '🔥 불에 탔어요', cactus: '🌵 선인장에 찔렸어요',
    arrow: '🏹 화살에 맞았어요', zombie: '🧟 좀비에게 당했어요', slime: '🟢 슬라임에게 당했어요', starve: '배가 고파요', void: '아래로 떨어졌어요' };

  // 정육면체 여섯 면: 바깥에서 볼 때 왼쪽아래 → 오른쪽아래 → 오른쪽위 → 왼쪽위 순서. s = 밝기(면마다 다르게 해서 입체감)
  const FACES = [
    { d: [1, 0, 0], s: 0.8, t: 'side', c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
    { d: [-1, 0, 0], s: 0.8, t: 'side', c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
    { d: [0, 1, 0], s: 1.0, t: 'top', c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
    { d: [0, -1, 0], s: 0.5, t: 'bottom', c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { d: [0, 0, 1], s: 0.65, t: 'side', c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
    { d: [0, 0, -1], s: 0.65, t: 'side', c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
  ];

  let renderer, scene, camera, material, mesh, outline, root, hud;
  let ghostMesh = [], ghostMat = [];
  let W, H, D, vox, o;           // 세계 크기, 블록 배열, 열 때 받은 설정
  let running = false, active = false, last = 0, saveTimer = null, startTime = 0, sel = 0, finished = false;
  let clock = 0, fails = 0;      // clock = 멈춘 시간을 뺀 놀이 시간(초). 고스트 블록·다친 뒤 무적 시간에 쓴다
  const P = { half: HALF, h: HEIGHT, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, kx: 0, kz: 0, yaw: 0, pitch: 0, ground: false, fly: false,
    hp: MAX_HP, food: MAX_FOOD, exhaust: 0, fallTop: 0, safeUntil: 0, burn: 0, burnTick: 0, regenT: 0, starveT: 0, eatT: 0, hungryWarn: 0 };
  let respawn = null;
  let mobs = [], arrows = [], items = [], dispensers = [];
  const keys = {};
  let stepDist = 0; // 발소리: 이만큼 걸을 때마다 한 번
  // 블록 재질 → 소리 색 (sfx.js)
  const WOOD = ['log', 'planks', 'crafting_table', 'door', 'bed', 'chest', 'fence'];
  const matOf = (b) => (!b ? 'stone' : ['grass', 'dirt', 'leaves', 'cactus'].includes(b.id) ? 'grass' : b.id === 'sand' ? 'sand'
    : WOOD.includes(b.id) ? 'wood' : b.id === 'glass' ? 'glass' : 'stone');
  const $ = (id) => document.getElementById(id);

  const idx = (x, y, z) => x + W * (z + D * y);
  const inside = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < D;
  const get = (x, y, z) => (inside(x, y, z) ? vox[idx(x, y, z)] : 0);
  const blockAt = (x, y, z) => Blocks.BY_NUM[get(Math.floor(x), Math.floor(y), Math.floor(z))];
  // 고스트 블록: 4초마다 한 바퀴. 1번은 0~2.4초, 2번은 2~4.4초에 단단하다 (바뀌는 사이 0.4초는 둘 다 있다)
  const ghostOn = (k) => { const t = clock % 4; return k === 1 ? t < 2.4 : t >= 2 || t < 0.4; };
  // 밟거나 부딪히는 블록인가 (용암은 빠지고, 사라진 고스트 블록은 지나간다)
  function solid(x, y, z) {
    const v = get(x, y, z);
    if (!v) return false;
    const b = Blocks.BY_NUM[v];
    if (b.liquid) return false;
    if (b.ghost) return ghostOn(b.ghost);
    return true;
  }
  const survival = () => o.mode === 'adventure';

  // ----- 하트·고기 그림 (픽셀) -----
  function pix(rows, pal) {
    const c = document.createElement('canvas');
    c.width = rows[0].length; c.height = rows.length;
    const g = c.getContext('2d');
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
    return `url(${c.toDataURL()})`;
  }
  const HEART = ['.kk...kk.', 'krrk.krrk', 'kwrrrrrrk', 'krrrrrrrk', 'krrrrrrrk', '.krrrrrk.', '..krrrk..', '...krk...', '....k....'];
  const MEAT = ['....kkk..', '...kmmmk.', '..kmmwmmk', '..kmmmmmk', '..kmmmmmk', '...kmmmk.', '..kbkkk..', '.kbbk....', 'kbbk.....'];
  const ICONS = {
    heart: pix(HEART, { k: '#3a0808', r: '#e02424', w: '#ff9a9a' }), heartE: pix(HEART, { k: '#1a0606', r: '#3a1414', w: '#3a1414' }),
    meat: pix(MEAT, { k: '#3a1a08', m: '#c46a2a', w: '#f0a060', b: '#f4ecd8' }), meatE: pix(MEAT, { k: '#1a1008', m: '#3a2a1a', w: '#3a2a1a', b: '#4a4a4a' }),
  };
  function iconRow(value, full, empty) {
    let h = '';
    for (let i = 0; i < 10; i++) {
      const fill = Math.max(0, Math.min(2, value - i * 2)); // 칸 하나 = 2
      h += `<i style="background-image:${empty}">${fill ? `<b style="background-image:${full};width:${fill * 50}%"></b>` : ''}</i>`;
    }
    return h;
  }
  function drawStats() {
    const on = survival();
    hud.stats.classList.toggle('hidden', !on);
    if (!on) return;
    hud.hearts.innerHTML = iconRow(P.hp, ICONS.heart, ICONS.heartE);
    hud.hearts.classList.toggle('low', P.hp <= 6);
    hud.foodRow.innerHTML = iconRow(P.food, ICONS.meat, ICONS.meatE);
    const bag = Object.entries(FOODS).map(([k, f]) => `${f.icon}${o.food[k] || 0}`).join(' ');
    hud.bag.textContent = `${bag} · E 먹기`;
  }

  function setup() {
    root = $('world3d');
    hud = {
      mode: $('w3Mode'), msg: $('w3Msg'), time: $('w3Time'), fails: $('w3Fails'), bar: $('w3Hotbar'), pause: $('w3Pause'), help: $('w3Help'),
      stats: $('w3Stats'), hearts: $('w3Hearts'), foodRow: $('w3Food'), bag: $('w3Bag'), hurt: $('w3Hurt'), fire: $('w3Fire'),
    };
    renderer = new THREE.WebGLRenderer({ canvas: $('w3Canvas'), antialias: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.05, 300);
    camera.rotation.order = 'YXZ';
    const tex = new THREE.CanvasTexture(Blocks.atlas);
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    material = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, alphaTest: 0.5 });
    ghostMat = [null, 1, 2].map((k) => k && new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
    outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)),
      new THREE.LineBasicMaterial({ color: 0x000000 }));
    outline.visible = false;
    scene.add(outline);
    // 몹은 빛을 받아서 입체로 보이게 (블록은 빛과 상관없이 그린다)
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const sun = new THREE.DirectionalLight(0xffffff, 0.55);
    sun.position.set(0.5, 1, 0.3);
    scene.add(sun);

    window.addEventListener('resize', resize);
    document.addEventListener('keydown', (e) => {
      if (!running) return;
      keys[e.code] = true;
      if (/^Digit[1-9]$/.test(e.code)) { sel = +e.code.slice(5) - 1; drawHotbar(); }
      if (e.code === 'KeyF' && o.mode === 'build') { P.fly = !P.fly; P.vy = 0; toast(P.fly ? '🕊️ 날기 켜짐 (스페이스 위, 시프트 아래)' : '날기 꺼짐'); Sfx.play('fly'); }
      if (e.code === 'KeyE' && active) eat();
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (e.code === 'Escape' && active && document.pointerLockElement !== root) pause(); // 마우스 잠금 없이 할 때
    });
    document.addEventListener('keyup', (e) => { keys[e.code] = false; });
    document.addEventListener('mousemove', (e) => {
      if (!running || document.pointerLockElement !== root) return;
      P.yaw -= e.movementX * 0.0025;
      P.pitch = Math.max(-1.55, Math.min(1.55, P.pitch - e.movementY * 0.0025));
    });
    root.addEventListener('mousedown', (e) => {
      if (!running || e.target.closest('.w3-panel')) return; // 멈춤 창의 버튼은 따로 처리
      if (!active) { resume(); return; }
      if (e.button === 0) { if (!attack()) breakBlock(); } else if (e.button === 2) { if (o.mode === 'build') placeBlock(); else eat(); }
    });
    root.addEventListener('contextmenu', (e) => e.preventDefault());
    root.addEventListener('wheel', (e) => { if (!running) return; const n = hotbarItems().length || 1; sel = (sel + (e.deltaY > 0 ? 1 : -1) + n) % n; drawHotbar(); });
    document.addEventListener('pointerlockchange', () => {
      if (!running) return;
      if (document.pointerLockElement === root) { active = true; hud.pause.classList.add('hidden'); } else pause();
    });
    $('w3Resume').onclick = resume;
    $('w3Exit').onclick = () => close(true);
    $('w3Switch').onclick = () => { setMode(o.mode === 'build' ? 'adventure' : 'build'); resume(); };
  }

  // ----- 그물(메시) 만들기: 공기와 맞닿은 면만 그린다 -----
  function geometry(want) {
    const pos = [], col = [], uv = [], ind = [];
    const tw = 1 / Blocks.COLS, th = 1 / Blocks.ROWS, pad = 0.02 / 16;
    for (let y = 0; y < H; y++) for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const v = vox[idx(x, y, z)];
      if (!v) continue;
      const b = Blocks.BY_NUM[v];
      if (!want(b)) continue;
      for (const f of FACES) {
        const n = get(x + f.d[0], y + f.d[1], z + f.d[2]);
        if (n && !(Blocks.BY_NUM[n].see && n !== v)) continue; // 막힌 면은 안 그린다 (유리 같은 비치는 블록 옆은 그린다)
        const t = b.tile[f.t];
        const u0 = (t % Blocks.COLS) * tw + pad, u1 = u0 + tw - 2 * pad;
        const v1 = 1 - Math.floor(t / Blocks.COLS) * th - pad, v0 = v1 - th + 2 * pad;
        const base = pos.length / 3;
        const s = b.liquid ? 1 : f.s; // 용암은 스스로 빛나서 어둡게 하지 않는다
        f.c.forEach(([cx, cy, cz]) => { pos.push(x + cx, y + cy - (b.liquid && cy ? 0.12 : 0), z + cz); col.push(s, s, s); });
        uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
        ind.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(ind);
    return g;
  }
  function rebuild() {
    if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
    mesh = new THREE.Mesh(geometry((b) => !b.ghost), material);
    scene.add(mesh);
    ghostMesh.forEach((m) => { if (m) { scene.remove(m); m.geometry.dispose(); } });
    ghostMesh = [null, 1, 2].map((k) => {
      if (!k) return null;
      const m = new THREE.Mesh(geometry((b) => b.ghost === k), ghostMat[k]);
      scene.add(m);
      return m;
    });
  }
  // 고스트 블록 투명도: 있을 때 진하게, 곧 사라질 때 깜빡깜빡, 없을 때 아주 흐리게
  function ghostAlpha(k) {
    if (!ghostOn(k)) return 0.12;
    const t = clock % 4, off = k === 1 ? 2.4 : 0.4;
    const left = (((off - t) % 4) + 4) % 4;
    return left < 0.8 ? (Math.floor(left * 8) % 2 ? 0.3 : 0.85) : 0.85;
  }

  // ----- 몸(상자)이 블록에 부딪히나 -----
  function boxHits(px, py, pz, half, h) {
    for (let y = Math.floor(py); y <= Math.floor(py + h - 0.001); y++)
      for (let z = Math.floor(pz - half); z <= Math.floor(pz + half - 0.001); z++)
        for (let x = Math.floor(px - half); x <= Math.floor(px + half - 0.001); x++)
          if (solid(x, y, z)) return true;
    return false;
  }
  // 몸 가까이에 이런 블록이 있나 (용암·선인장)
  function boxTouches(px, py, pz, half, h, id, grow = 0) {
    for (let y = Math.floor(py - grow); y <= Math.floor(py + h + grow - 0.001); y++)
      for (let z = Math.floor(pz - half - grow); z <= Math.floor(pz + half + grow - 0.001); z++)
        for (let x = Math.floor(px - half - grow); x <= Math.floor(px + half + grow - 0.001); x++) {
          const b = Blocks.BY_NUM[get(x, y, z)];
          if (b && b.id === id) return true;
        }
    return false;
  }
  // 한 축씩 조금씩 움직이다가 막히면 멈춘다 (나와 몹이 같이 쓴다)
  function move(e, axis, dist) {
    const steps = Math.ceil(Math.abs(dist) / 0.2) || 1, step = dist / steps;
    for (let i = 0; i < steps; i++) {
      const nx = e.x + (axis === 'x' ? step : 0), ny = e.y + (axis === 'y' ? step : 0), nz = e.z + (axis === 'z' ? step : 0);
      if (boxHits(nx, ny, nz, e.half, e.h)) {
        if (axis === 'y') { if (step < 0) e.ground = true; e.vy = 0; }
        else if (axis === 'x') e.kx = 0; else e.kz = 0;
        return;
      }
      e.x = nx; e.y = ny; e.z = nz;
    }
  }

  // 시작·계속: 마우스를 잠가서 둘러보게 한다. 잠글 수 없는 곳(일부 창)에서는 화살표 키로 둘러본다
  function resume() {
    active = true;
    hud.pause.classList.add('hidden');
    try { const p = root.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* 화살표 키로 */ }
  }
  function pause() {
    active = false;
    hud.pause.classList.remove('hidden');
    Object.keys(keys).forEach((k) => (keys[k] = false));
  }

  // ----- 체력·배고픔 -----
  function hurt(n, why, from, push = 5) {
    if (!survival() || P.hp <= 0 || clock < P.safeUntil) return;
    P.safeUntil = clock + 0.5; // 다친 뒤 0.5초는 또 다치지 않는다
    P.hp = Math.max(0, P.hp - n);
    P.exhaust += 0.1;
    if (from) { // 맞은 반대쪽으로 밀려난다
      const dx = P.x - from.x, dz = P.z - from.z, l = Math.hypot(dx, dz) || 1;
      P.kx = (dx / l) * push; P.kz = (dz / l) * push;
      P.vy = Math.max(P.vy, 5);
    }
    hud.hurt.classList.remove('on'); void hud.hurt.offsetWidth; hud.hurt.classList.add('on');
    setTimeout(() => hud.hurt.classList.remove('on'), 120);
    Sfx.play('hurt');
    drawStats();
    if (P.hp <= 0) die(why);
  }
  function die(why) {
    fails++;
    Sfx.play(why === 'void' ? 'fall' : 'death');
    toast(`💀 ${DEATH[why] || '쓰러졌어요'}! ${respawn === o.spawn ? '처음' : '체크포인트'}에서 다시 해요.`);
    restore();
    spawnAt(respawn);
    arrows.forEach((a) => scene.remove(a.mesh));
    arrows = [];
    hud.fails.textContent = o.timer ? `💀 실패 ${fails}` : '';
  }
  function restore() {
    Object.assign(P, { hp: MAX_HP, food: MAX_FOOD, exhaust: 0, burn: 0, regenT: 0, starveT: 0, kx: 0, kz: 0, safeUntil: clock + 1 });
    hud.fire.classList.add('hidden');
    drawStats();
  }
  function eat() {
    if (!survival() || clock < P.eatT) return;
    if (P.food >= MAX_FOOD) return toast('배가 불러요!');
    const need = MAX_FOOD - P.food;
    const have = Object.keys(FOODS).filter((k) => (o.food[k] || 0) > 0);
    if (!have.length) { Sfx.play('deny'); return toast('🍎 음식이 없어요. 블록 세상의 음식 가게에서 사거나 맵에서 주워요.'); }
    // 배고픈 만큼 채워 주는 가장 큰 음식 (없으면 가장 작은 것)
    const fit = have.filter((k) => FOODS[k].food <= need).sort((a, b) => FOODS[b].food - FOODS[a].food);
    const k = fit[0] || have.sort((a, b) => FOODS[a].food - FOODS[b].food)[0];
    o.food[k]--;
    P.food = Math.min(MAX_FOOD, P.food + FOODS[k].food);
    P.eatT = clock + 0.6;
    Sfx.play('eat');
    toast(`${FOODS[k].icon} ${FOODS[k].name} 냠냠! 배고픔 +${FOODS[k].food / 2}`);
    drawStats();
  }
  function body(dt, moved, sprinting) {
    if (!survival()) return;
    // 용암·불·선인장
    const inLava = boxTouches(P.x, P.y, P.z, HALF, HEIGHT, 'lava');
    if (inLava) { if (P.burn <= 0) Sfx.play('sizzle'); P.burn = 3; hurt(4, 'lava'); }
    else if (P.burn > 0) {
      P.burn -= dt;
      P.burnTick += dt;
      if (P.burnTick >= 1) { P.burnTick = 0; hurt(1, 'fire'); }
    }
    hud.fire.classList.toggle('hidden', P.burn <= 0);
    if (boxTouches(P.x, P.y, P.z, HALF, HEIGHT, 'cactus', 0.06)) hurt(1, 'cactus');
    // 배고픔: 가만히 있어도 30초에 고기 반 칸, 달리기·점프는 더 빨리
    P.exhaust += dt / 30 + (sprinting ? moved * 0.03 : 0);
    while (P.exhaust >= 1) { P.exhaust -= 1; if (P.food > 0) { P.food--; drawStats(); } }
    if (P.food >= 16 && P.hp < MAX_HP && P.hp > 0) { // 배가 부르면 2초마다 하트 반 칸
      P.regenT += dt;
      if (P.regenT >= 2) { P.regenT = 0; P.hp++; P.exhaust += 0.4; drawStats(); }
    } else P.regenT = 0;
    if (P.food === 0) { // 굶으면 4초마다 하트 반 칸 (하트 반 칸까지만)
      P.starveT += dt;
      if (P.starveT >= 4) { P.starveT = 0; if (P.hp > 1) hurt(1, 'starve'); }
    }
    return inLava;
  }

  function update(dt) {
    clock += dt;
    // 고스트 블록이 생기면서 몸이 끼었으면 위로 빼낸다
    if (boxHits(P.x, P.y, P.z, HALF, HEIGHT)) {
      for (let k = 1; k <= 3; k++) if (!boxHits(P.x, Math.floor(P.y) + k, P.z, HALF, HEIGHT)) { P.y = Math.floor(P.y) + k; break; }
    }
    P.yaw += ((keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0)) * 2.2 * dt;
    P.pitch = Math.max(-1.55, Math.min(1.55, P.pitch + ((keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0)) * 1.6 * dt));
    const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const shift = keys.ShiftLeft || keys.ShiftRight;
    const hungry = survival() && P.food <= 6;
    if (shift && hungry && (f || s) && !P.fly && clock > P.hungryWarn) { P.hungryWarn = clock + 4; toast('🍗 배가 고파서 달릴 수 없어요. E를 눌러 먹어요.'); }
    const sprinting = !P.fly && shift && !hungry && (f || s);
    const inLava = survival() && boxTouches(P.x, P.y, P.z, HALF, HEIGHT, 'lava');
    const sp = (P.fly ? FLY : sprinting ? RUN : WALK) * (inLava ? 0.4 : 1);
    const sin = Math.sin(P.yaw), cos = Math.cos(P.yaw);
    let vx = -sin * f + cos * s, vz = -cos * f - sin * s;
    const len = Math.hypot(vx, vz) || 1;
    const kd = Math.exp(-6 * dt);
    P.kx *= kd; P.kz *= kd;
    P.vx = (vx / len) * (f || s ? sp : 0) + P.kx;
    P.vz = (vz / len) * (f || s ? sp : 0) + P.kz;
    if (P.fly) {
      P.vy = (keys.Space ? FLY : 0) - (shift ? FLY : 0);
    } else if (inLava) { // 용암 속: 천천히 가라앉고, 스페이스로 천천히 헤엄쳐 오른다
      P.vy = keys.Space ? 3 : Math.max(P.vy - GRAVITY * 0.25 * dt, -2);
    } else {
      P.vy -= GRAVITY * dt;
      if (keys.Space && P.ground) { P.vy = JUMP; Sfx.play('jump'); if (survival()) P.exhaust += sprinting ? 0.08 : 0.03; }
    }
    const wasGround = P.ground, fallV = P.vy, ox = P.x, oz = P.z;
    P.ground = false;
    move(P, 'x', P.vx * dt);
    move(P, 'z', P.vz * dt);
    move(P, 'y', P.vy * dt);
    const moved = Math.hypot(P.x - ox, P.z - oz);
    if (P.fly || inLava) P.fallTop = P.y;
    else if (!P.ground) P.fallTop = Math.max(P.fallTop, P.y);
    if (P.ground && !wasGround && !P.fly) {
      const drop = P.fallTop - P.y;
      if (fallV < -7) Sfx.play('land'); // 쿵 내려앉기
      if (drop > 3.5 && survival()) { P.safeUntil = 0; hurt(Math.round(drop - 3), 'fall'); } // 네 칸 넘게 떨어지면 다친다
    }
    if (P.ground) P.fallTop = P.y;
    if (P.ground) { // 걸을 때 발소리 (밟은 블록 재질에 따라)
      stepDist += moved;
      if (stepDist > 1.7) { stepDist = 0; Sfx.play('step', matOf(blockAt(P.x, P.y - 0.05, P.z))); }
    }
    body(dt, moved, sprinting);
    if (P.y < -12) {
      if (survival()) die('void');
      else { toast('떨어졌어요! 다시 시작해요.'); Sfx.play('fall'); spawnAt(respawn); }
    }
    // 발밑 블록: 체크포인트·도착
    const under = blockAt(P.x, P.y - 0.05, P.z);
    if (under && P.ground) {
      if (under.id === 'check') {
        const c = [Math.floor(P.x) + 0.5, Math.floor(P.y), Math.floor(P.z) + 0.5];
        if (!respawn || respawn[0] !== c[0] || respawn[1] !== c[1] || respawn[2] !== c[2]) { respawn = c; toast('🚩 체크포인트! 떨어지면 여기서 다시 시작해요.'); Sfx.play('checkpoint'); }
      }
      if (under.id === 'goal' && o.mode === 'adventure' && o.onGoal && !finished) { // 건축 모드(날기)로 닿은 건 치지 않는다
        finished = true;
        active = false;
        document.exitPointerLock();
        Sfx.play('goal');
        o.onGoal(Date.now() - startTime, fails);
      }
    }
    world(dt);
    pose();
    // 바라보는 블록에 테두리
    const hit = o.mode === 'build' ? ray() : null;
    outline.visible = !!hit;
    if (hit) outline.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    if (o.timer && !finished) hud.time.textContent = '⏱ ' + ((Date.now() - startTime) / 1000).toFixed(1) + '초';
  }

  // ----- 몹·화살·발사기·음식 -----
  function world(dt) {
    for (let k = 1; k <= 2; k++) ghostMat[k].opacity = ghostAlpha(k);
    dispensers.forEach((d) => {
      const dx = P.x - d.x, dy = P.y + 1.2 - d.y, dz = P.z - d.z;
      if (dx * dx + dy * dy + dz * dz > 13 * 13 || P.hp <= 0) return;
      d.t -= dt;
      if (d.t > 0) return;
      d.t = o.fireEvery || 2.6;
      const l = Math.hypot(dx, dy, dz) || 1;
      shoot(d.x + (dx / l) * 0.75, d.y + (dy / l) * 0.75, d.z + (dz / l) * 0.75);
    });
    mobs.forEach((m) => updateMob(m, dt));
    mobs = mobs.filter((m) => m.alive);
    updateArrows(dt);
    items.forEach((it) => {
      if (it.got) return;
      it.sprite.position.y = it.y + 0.35 + Math.sin(clock * 3 + it.x) * 0.12;
      if (Math.hypot(P.x - it.x, P.y + 0.8 - it.y, P.z - it.z) < 1.1) {
        it.got = true;
        scene.remove(it.sprite);
        o.food[it.type] = (o.food[it.type] || 0) + 1;
        Sfx.play('pop');
        toast(`${FOODS[it.type].icon} ${FOODS[it.type].name}을(를) 주웠어요! (E로 먹기)`);
        drawStats();
      }
    });
  }

  // 몹 모양: 상자 몇 개로 (앞쪽이 +z)
  function makeMob(type) {
    const g = new THREE.Group(), mats = [];
    const mat = (c, extra) => { const m = new THREE.MeshLambertMaterial({ color: c, ...extra }); mats.push(m); return m; };
    const box = (w, h, d, c, x, y, z, parent = g, extra) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, extra)); m.position.set(x, y, z); parent.add(m); return m; };
    const limb = (w, h, d, c, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); g.add(p); box(w, h, d, c, 0, -h / 2, 0, p); return p; };
    const parts = { legs: [], arms: [] };
    if (type === 'slime') {
      parts.inner = box(0.5, 0.5, 0.5, '#3a9a2a', 0, 0.42, 0);
      box(0.1, 0.12, 0.02, '#102010', -0.14, 0.58, 0.46); box(0.1, 0.12, 0.02, '#102010', 0.14, 0.58, 0.46);
      box(0.14, 0.06, 0.02, '#102010', 0.05, 0.36, 0.46);
      parts.outer = box(0.9, 0.9, 0.9, '#7ee05a', 0, 0.45, 0, g, { transparent: true, opacity: 0.6, depthWrite: false });
    } else {
      const zombie = type === 'zombie';
      const skin = zombie ? '#5f9e46' : '#d8d6cc', shirt = zombie ? '#7a3f2a' : '#bcbab0', legs = zombie ? '#3a3a58' : '#c8c6bc';
      const lw = zombie ? 0.24 : 0.13;
      parts.legs = [limb(lw, 0.72, lw, legs, -0.13, 0.72, 0), limb(lw, 0.72, lw, legs, 0.13, 0.72, 0)];
      box(0.5, 0.72, 0.26, shirt, 0, 1.08, 0);
      if (!zombie) [0.86, 1.0, 1.14, 1.28].forEach((y) => box(0.36, 0.05, 0.28, '#6a6a64', 0, y, 0)); // 갈비뼈
      const arm = (x) => { const p = new THREE.Group(); p.position.set(x, 1.36, 0); g.add(p); box(lw, lw, 0.66, zombie ? skin : '#d8d6cc', 0, 0, 0.3, p); return p; };
      parts.arms = [arm(-0.36), arm(0.36)];
      if (!zombie) box(0.05, 0.7, 0.05, '#6a4a2a', 0.36, 1.36, 0.62); // 활
      box(0.46, 0.46, 0.46, skin, 0, 1.68, 0);
      box(0.1, 0.08, 0.02, zombie ? '#1a2a10' : '#202020', -0.11, 1.72, 0.235); box(0.1, 0.08, 0.02, zombie ? '#1a2a10' : '#202020', 0.11, 1.72, 0.235);
      if (!zombie) box(0.22, 0.04, 0.02, '#303030', 0, 1.56, 0.235);
    }
    return { g, mats, parts };
  }
  function addMob(def) {
    const d = MOBS[def.type];
    const { g, mats, parts } = makeMob(def.type);
    scene.add(g);
    mobs.push({ type: def.type, x: def.x, y: def.y, z: def.z, vx: 0, vy: 0, vz: 0, kx: 0, kz: 0, half: d.half, h: d.h, hp: d.hp, yaw: 0,
      ground: false, alive: true, mesh: g, mats, parts, walk: 0, hopT: 0.5 + Math.random(), hx: 0, hz: 0,
      atkT: 0, shootT: 1 + Math.random() * 2, voiceT: 2 + Math.random() * 4, flash: 0 });
  }
  // 앞에 발 디딜 곳이 있나 (몹이 허공·용암으로 걸어가지 않게)
  function floorAhead(m, ux, uz, dist) {
    const fx = Math.floor(m.x + ux * (dist + m.half)), fz = Math.floor(m.z + uz * (dist + m.half)), fy = Math.floor(m.y - 0.5);
    const b = Blocks.BY_NUM[get(fx, fy, fz)];
    if (b && b.liquid) return false;
    return solid(fx, fy, fz) || (!b && solid(fx, fy - 1, fz));
  }
  function updateMob(m, dt) {
    const def = MOBS[m.type];
    const dx = P.x - m.x, dz = P.z - m.z, dist = Math.hypot(dx, dz) || 0.001, dy = P.y - m.y;
    const ux = dx / dist, uz = dz / dist;
    const near = survival() && P.hp > 0 && dist < 12 && Math.abs(dy) < 4;
    if (near) m.yaw = Math.atan2(dx, dz);
    const kd = Math.exp(-5 * dt);
    m.kx *= kd; m.kz *= kd;
    let wx = 0, wz = 0;
    if (m.type === 'zombie' && near && dist > 0.7 && floorAhead(m, ux, uz, 0.3)) { wx = ux * def.speed; wz = uz * def.speed; }
    if (m.type === 'slime') {
      if (m.ground) {
        m.hx = m.hz = 0;
        m.hopT -= dt;
        if (m.hopT <= 0 && near) {
          m.hopT = 0.9 + Math.random() * 0.6;
          m.vy = 6.5;
          if (floorAhead(m, ux, uz, 1.2)) { m.hx = ux * 3; m.hz = uz * 3; }
        }
      }
      wx = m.hx; wz = m.hz;
    }
    if (m.type === 'skeleton' && near && dist < 14) {
      m.shootT -= dt;
      if (m.shootT <= 0) { m.shootT = def.shoot; shoot(m.x + ux * 0.6, m.y + 1.4, m.z + uz * 0.6); }
    }
    m.vx = wx + m.kx; m.vz = wz + m.kz;
    m.vy -= GRAVITY * dt;
    m.ground = false;
    move(m, 'x', m.vx * dt);
    move(m, 'z', m.vz * dt);
    move(m, 'y', m.vy * dt);
    if (m.y < -12) { kill(m, false); return; }
    if (boxTouches(m.x, m.y, m.z, m.half, m.h, 'lava')) { m.hp -= 10 * dt; if (m.hp <= 0) { kill(m, false); return; } }
    // 나와 닿으면 때린다
    m.atkT -= dt;
    if (def.dmg && m.atkT <= 0 && Math.abs(P.x - m.x) < HALF + m.half + 0.15 && Math.abs(P.z - m.z) < HALF + m.half + 0.15 &&
      P.y < m.y + m.h && P.y + HEIGHT > m.y) { m.atkT = 0.8; hurt(def.dmg, m.type, m, def.push); }
    m.voiceT -= dt;
    if (m.voiceT <= 0) { m.voiceT = 4 + Math.random() * 5; if (dist < 9) Sfx.play(def.voice); }
    // 움직임 그리기
    const speed = Math.hypot(wx, wz);
    m.walk += speed * dt * 3.2;
    const swing = speed > 0.1 ? Math.sin(m.walk) * 0.7 : 0;
    m.parts.legs.forEach((l, i) => (l.rotation.x = i ? swing : -swing));
    if (m.parts.outer) { const sq = m.ground ? 1 : 1.15; m.parts.outer.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)); }
    m.flash -= dt;
    m.mats.forEach((mt) => mt.emissive.setHex(m.flash > 0 ? 0x990000 : 0x000000));
    m.mesh.position.set(m.x, m.y, m.z);
    m.mesh.rotation.y = m.yaw;
  }
  function kill(m, byMe) {
    m.alive = false;
    scene.remove(m.mesh);
    if (byMe) { Sfx.play('pop'); toast(`⚔️ ${MOBS[m.type].name}을(를) 물리쳤어요!`); }
  }
  // 바라보는 곳의 몹을 때린다 (때렸으면 true)
  function rayBox(o3, d, mn, mx) {
    let t0 = 0, t1 = Infinity;
    for (let a = 0; a < 3; a++) {
      if (Math.abs(d[a]) < 1e-9) { if (o3[a] < mn[a] || o3[a] > mx[a]) return null; continue; }
      let ta = (mn[a] - o3[a]) / d[a], tb = (mx[a] - o3[a]) / d[a];
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      if (t0 > t1) return null;
    }
    return t0;
  }
  function attack() {
    const org = [P.x, P.y + EYE, P.z], dir = [-Math.sin(P.yaw) * Math.cos(P.pitch), Math.sin(P.pitch), -Math.cos(P.yaw) * Math.cos(P.pitch)];
    const wall = ray();
    let best = null, bt = Math.min(HIT_REACH, wall ? wall.t : Infinity);
    mobs.forEach((m) => {
      const t = rayBox(org, dir, [m.x - m.half, m.y, m.z - m.half], [m.x + m.half, m.y + m.h, m.z + m.half]);
      if (t !== null && t < bt) { bt = t; best = m; }
    });
    if (!best) return false;
    best.hp -= 4;
    best.flash = 0.25;
    best.kx = dir[0] * 8; best.kz = dir[2] * 8; best.vy = 4.5;
    Sfx.play('punch');
    if (best.hp <= 0) kill(best, true); else Sfx.play(MOBS[best.type].voice);
    return true;
  }
  // 화살: 나를 향해 곧게 날아온다. 블록에 꽂히면 사라진다
  let arrowGeo = null;
  function shoot(x, y, z) {
    const tx = P.x, ty = P.y + 1.1, tz = P.z;
    const dx = tx - x, dy = ty - y, dz = tz - z, l = Math.hypot(dx, dy, dz) || 1, sp = 13;
    if (!arrowGeo) arrowGeo = [new THREE.BoxGeometry(0.05, 0.05, 0.7), new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.BoxGeometry(0.16, 0.02, 0.16)];
    const g = new THREE.Group();
    g.add(new THREE.Mesh(arrowGeo[0], new THREE.MeshLambertMaterial({ color: '#8a6a3a' })));
    const head = new THREE.Mesh(arrowGeo[1], new THREE.MeshLambertMaterial({ color: '#9a9a9a' })); head.position.z = 0.38; g.add(head);
    const tail = new THREE.Mesh(arrowGeo[2], new THREE.MeshLambertMaterial({ color: '#f0f0f0' })); tail.position.z = -0.32; g.add(tail);
    g.position.set(x, y, z);
    g.lookAt(x + dx, y + dy, z + dz);
    scene.add(g);
    arrows.push({ x, y, z, vx: (dx / l) * sp, vy: (dy / l) * sp, vz: (dz / l) * sp, life: 3, mesh: g });
    Sfx.play('bow');
  }
  function updateArrows(dt) {
    arrows = arrows.filter((a) => {
      a.life -= dt;
      for (let i = 0; i < 4; i++) {
        a.x += (a.vx * dt) / 4; a.y += (a.vy * dt) / 4; a.z += (a.vz * dt) / 4;
        if (solid(Math.floor(a.x), Math.floor(a.y), Math.floor(a.z))) { Sfx.play('thunk'); a.life = 0; break; }
        if (survival() && Math.abs(a.x - P.x) < HALF + 0.15 && Math.abs(a.z - P.z) < HALF + 0.15 && a.y > P.y - 0.1 && a.y < P.y + HEIGHT + 0.1) {
          hurt(3, 'arrow', { x: a.x - a.vx, z: a.z - a.vz }, 3);
          a.life = 0;
          break;
        }
      }
      if (a.life <= 0) { scene.remove(a.mesh); return false; }
      a.mesh.position.set(a.x, a.y, a.z);
      return true;
    });
  }
  // 떠 있는 음식 그림
  const foodTex = {};
  function foodSprite(type) {
    if (!foodTex[type]) {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d');
      g.font = '52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(FOODS[type].icon, 32, 36);
      foodTex[type] = new THREE.CanvasTexture(c);
    }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: foodTex[type], transparent: true }));
    s.scale.set(0.6, 0.6, 0.6);
    return s;
  }

  // ----- 바라보는 방향으로 블록 찾기 (칸을 하나씩 건너가는 방법) -----
  function ray() {
    const ox = P.x, oy = P.y + EYE, oz = P.z;
    const dx = -Math.sin(P.yaw) * Math.cos(P.pitch), dy = Math.sin(P.pitch), dz = -Math.cos(P.yaw) * Math.cos(P.pitch);
    let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    const sx = Math.sign(dx), sy = Math.sign(dy), sz = Math.sign(dz);
    const tdx = Math.abs(1 / dx), tdy = Math.abs(1 / dy), tdz = Math.abs(1 / dz);
    const first = (s, c, o, td) => (s === 0 ? Infinity : (s > 0 ? c + 1 - o : o - c) * td); // 처음 칸 경계까지 거리
    let tx = first(sx, x, ox, tdx), ty = first(sy, y, oy, tdy), tz = first(sz, z, oz, tdz);
    let px = x, py = y, pz = z, t = 0;
    while (t <= REACH) {
      if (get(x, y, z)) return { x, y, z, px, py, pz, t };
      px = x; py = y; pz = z;
      if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; }
      else if (ty < tz) { y += sy; t = ty; ty += tdy; }
      else { z += sz; t = tz; tz += tdz; }
    }
    return null;
  }

  // 핫바: 가진 블록 + (내 세계면) 맵 도구 3개. 최대 9칸
  const TOOLS = Blocks.LIST.filter((b) => b.tool);
  const hotbarItems = () => Blocks.LIST.filter((b) => b.tier >= 0 && (o.inv[b.id] || 0) > 0).slice(0, o.tools ? 9 - TOOLS.length : 9).concat(o.tools ? TOOLS : []);
  function drawHotbar() {
    if (o.mode !== 'build') { hud.bar.innerHTML = ''; return; }
    const items = hotbarItems();
    if (sel >= items.length) sel = Math.max(0, items.length - 1);
    hud.bar.innerHTML = items.length
      ? items.map((b, i) => `<div class="slot${i === sel ? ' on' : ''}${b.tool ? ' tool' : ''}" title="${b.name}">${Blocks.icon(b)}<b>${b.tool ? '∞' : o.inv[b.id]}</b><i>${i + 1}</i></div>`).join('')
      : '<div class="empty">블록이 없어요. 끝말잇기로 모으거나 상점에서 사 오세요!</div>';
  }

  function breakBlock() {
    if (o.mode !== 'build') { // 모험 모드: 블록을 겨눴을 때만 알려 준다 (허공을 때리면 휙)
      if (ray()) { Sfx.play('deny'); toast('⛔ 모험 모드에서는 블록을 부술 수 없어요.'); } else Sfx.play('whiff');
      return;
    }
    const h = ray();
    if (!h) return;
    const b = Blocks.BY_NUM[get(h.x, h.y, h.z)];
    if (b.tier < 0 && !(b.tool && o.tools)) return toast(`${b.name} 블록은 부술 수 없어요.`);
    vox[idx(h.x, h.y, h.z)] = 0;
    if (!b.tool) o.inv[b.id] = (o.inv[b.id] || 0) + 1; // 맵 도구는 공짜라 가방에 안 돌아간다
    Sfx.play('breakBlock', matOf(b));
    changed();
  }
  function placeBlock() {
    if (o.mode !== 'build') { Sfx.play('deny'); return toast('⛔ 모험 모드에서는 블록을 놓을 수 없어요.'); }
    const h = ray();
    const b = hotbarItems()[sel];
    if (!h || !b) return;
    if (!inside(h.px, h.py, h.pz)) return toast('세상 밖에는 놓을 수 없어요.');
    if (b.id === 'start') vox.forEach((v, i) => { if (v === b.num) vox[i] = 0; }); // 출발 블록은 하나만
    vox[idx(h.px, h.py, h.pz)] = b.num;
    if (boxHits(P.x, P.y, P.z, HALF, HEIGHT)) { vox[idx(h.px, h.py, h.pz)] = 0; return; } // 내 몸이 있는 곳엔 못 놓는다
    if (!b.tool) o.inv[b.id]--;
    else if (b.id === 'start') toast('🚩 출발 블록! 모험 모드는 여기서 시작해요.');
    Sfx.play('place', matOf(b));
    changed();
  }
  function changed() {
    rebuild();
    drawHotbar();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => o.onSave && o.onSave(vox), 400);
  }

  let toastTimer;
  function toast(t) {
    hud.msg.textContent = t;
    hud.msg.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => hud.msg.classList.add('hidden'), 2200);
  }

  function setMode(m) {
    o.mode = m;
    if (m !== 'build') P.fly = false;
    hud.mode.textContent = m === 'build' ? '🔨 건축 모드' : '🧭 모험 모드';
    hud.help.textContent = m === 'build'
      ? 'WASD 이동 · 마우스/화살표 둘러보기 · 스페이스 점프 · 시프트 달리기 · 왼쪽 클릭 부수기 · 오른쪽 클릭 놓기 · 1~9/휠 블록 · F 날기 · Esc 멈춤'
      : 'WASD 이동 · 마우스/화살표 둘러보기 · 스페이스 점프 · 시프트 달리기 · 왼쪽 클릭 몹 때리기 · E/오른쪽 클릭 먹기 · Esc 멈춤';
    $('w3Switch').classList.toggle('hidden', !o.canSwitch);
    $('w3Switch').textContent = m === 'build' ? '🧭 모험 모드로 바꾸기' : '🔨 건축 모드로 바꾸기';
    if (m !== 'build') restore(); // 모험을 시작할 때는 체력·배고픔 가득
    drawHotbar();
    drawStats();
  }
  function pose() {
    camera.position.set(P.x, P.y + EYE, P.z);
    camera.rotation.set(P.pitch, P.yaw, 0);
  }
  function spawnAt(p) {
    [P.x, P.y, P.z] = p;
    P.vx = P.vy = P.vz = P.kx = P.kz = 0;
    P.fallTop = P.y;
  }
  function resize() {
    if (!renderer) return;
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  function loop(t) {
    if (!running) return;
    const dt = Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    if (active && !finished) update(dt); else pose();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  function clearThings() {
    mobs.forEach((m) => scene.remove(m.mesh));
    arrows.forEach((a) => scene.remove(a.mesh));
    items.forEach((it) => scene.remove(it.sprite));
    mobs = []; arrows = []; items = []; dispensers = [];
  }
  function open(opts) {
    if (!renderer) setup();
    o = opts;
    o.food = o.food || {};
    [W, H, D] = o.size;
    vox = o.data;
    finished = false;
    sel = 0;
    clock = 0;
    fails = 0;
    P.yaw = o.yaw || 0; P.pitch = 0; P.fly = false;
    respawn = o.spawn;
    spawnAt(o.spawn);
    scene.background = new THREE.Color(o.sky || '#8ec8ff');
    scene.fog = new THREE.Fog(o.sky || '#8ec8ff', 30, 90);
    hud.time.textContent = '';
    hud.time.classList.toggle('hidden', !o.timer);
    hud.fails.textContent = o.timer ? '💀 실패 0' : '';
    $('w3Title').textContent = o.title || '';
    clearThings();
    (o.mobs || []).forEach(addMob);
    (o.items || []).forEach((it) => { const s = foodSprite(it.type); s.position.set(it.x, it.y, it.z); scene.add(s); items.push({ ...it, sprite: s }); });
    const dn = Blocks.BY_ID.dispenser.num;
    vox.forEach((v, i) => { if (v === dn) dispensers.push({ x: (i % W) + 0.5, y: Math.floor(i / (W * D)) + 0.5, z: (Math.floor(i / W) % D) + 0.5, t: 1 + Math.random() * 2 }); });
    setMode(o.mode);
    rebuild();
    root.classList.remove('hidden');
    hud.pause.classList.remove('hidden');
    resize();
    running = true;
    active = false;
    startTime = Date.now();
    requestAnimationFrame((t) => { last = t; loop(t); });
  }
  function close(byUser) {
    if (!running) return;
    running = false;
    clearTimeout(saveTimer);
    clearThings();
    if (o.onSave) o.onSave(vox);
    if (document.pointerLockElement === root) document.exitPointerLock();
    root.classList.add('hidden');
    if (o.onExit) o.onExit(byUser);
  }
  return { open, close, FOODS };
})();

// ===== 3D 블록 세상 (Three.js) =====
// 1인칭으로 걷고(WASD), 뛰고(스페이스), 마우스로 둘러보고, 블록을 놓고(오른쪽 클릭) 부순다(왼쪽 클릭).
// 건축 모드: 놓기·부수기·날기(F) 가능 / 모험 모드: 걷기만 (부수기·놓기 안 됨)
// 쓰는 법: World3D.open({ size:[W,H,D], data, mode, canSwitch, spawn, sky, inv, onSave, onGoal, onExit })
const World3D = (() => {
  const GRAVITY = 28, JUMP = 9, WALK = 4.3, RUN = 6, FLY = 9, REACH = 6;
  const HALF = 0.3, HEIGHT = 1.8, EYE = 1.6;

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
  let W, H, D, vox, o;           // 세계 크기, 블록 배열, 열 때 받은 설정
  let running = false, active = false, last = 0, saveTimer = null, startTime = 0, sel = 0, finished = false;
  const P = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, ground: false, fly: false };
  let respawn = null;
  const keys = {};
  const $ = (id) => document.getElementById(id);

  const idx = (x, y, z) => x + W * (z + D * y);
  const inside = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < W && y < H && z < D;
  const get = (x, y, z) => (inside(x, y, z) ? vox[idx(x, y, z)] : 0);
  const solid = (x, y, z) => get(x, y, z) !== 0;

  function setup() {
    root = $('world3d');
    hud = {
      mode: $('w3Mode'), msg: $('w3Msg'), time: $('w3Time'), bar: $('w3Hotbar'), pause: $('w3Pause'), help: $('w3Help'),
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
    outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)),
      new THREE.LineBasicMaterial({ color: 0x000000 }));
    outline.visible = false;
    scene.add(outline);

    window.addEventListener('resize', resize);
    document.addEventListener('keydown', (e) => {
      if (!running) return;
      keys[e.code] = true;
      if (/^Digit[1-9]$/.test(e.code)) { sel = +e.code.slice(5) - 1; drawHotbar(); }
      if (e.code === 'KeyF' && o.mode === 'build') { P.fly = !P.fly; P.vy = 0; toast(P.fly ? '🕊️ 날기 켜짐 (스페이스 위, 시프트 아래)' : '날기 꺼짐'); }
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
      if (e.button === 0) breakBlock(); else if (e.button === 2) placeBlock();
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
  function rebuild() {
    const pos = [], col = [], uv = [], ind = [];
    const tw = 1 / Blocks.COLS, th = 1 / Blocks.ROWS, pad = 0.02 / 16;
    for (let y = 0; y < H; y++) for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const v = vox[idx(x, y, z)];
      if (!v) continue;
      const b = Blocks.BY_NUM[v];
      for (const f of FACES) {
        const n = get(x + f.d[0], y + f.d[1], z + f.d[2]);
        if (n && !(Blocks.BY_NUM[n].see && n !== v)) continue; // 막힌 면은 안 그린다 (유리 같은 비치는 블록 옆은 그린다)
        const t = b.tile[f.t];
        const u0 = (t % Blocks.COLS) * tw + pad, u1 = u0 + tw - 2 * pad;
        const v1 = 1 - Math.floor(t / Blocks.COLS) * th - pad, v0 = v1 - th + 2 * pad;
        const base = pos.length / 3;
        f.c.forEach(([cx, cy, cz]) => { pos.push(x + cx, y + cy, z + cz); col.push(f.s, f.s, f.s); });
        uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
        ind.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(ind);
    if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
    mesh = new THREE.Mesh(g, material);
    scene.add(mesh);
  }

  // ----- 몸이 블록에 부딪히나 -----
  function hits(px, py, pz) {
    for (let y = Math.floor(py); y <= Math.floor(py + HEIGHT - 0.001); y++)
      for (let z = Math.floor(pz - HALF); z <= Math.floor(pz + HALF - 0.001); z++)
        for (let x = Math.floor(px - HALF); x <= Math.floor(px + HALF - 0.001); x++)
          if (solid(x, y, z)) return true;
    return false;
  }
  // 한 축씩 조금씩 움직이다가 막히면 멈춘다
  function move(axis, dist) {
    const steps = Math.ceil(Math.abs(dist) / 0.2) || 1, step = dist / steps;
    for (let i = 0; i < steps; i++) {
      const nx = P.x + (axis === 'x' ? step : 0), ny = P.y + (axis === 'y' ? step : 0), nz = P.z + (axis === 'z' ? step : 0);
      if (hits(nx, ny, nz)) {
        if (axis === 'y') { if (step < 0) P.ground = true; P.vy = 0; }
        return;
      }
      P.x = nx; P.y = ny; P.z = nz;
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

  function update(dt) {
    P.yaw += ((keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0)) * 2.2 * dt;
    P.pitch = Math.max(-1.55, Math.min(1.55, P.pitch + ((keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0)) * 1.6 * dt));
    const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const sp = P.fly ? FLY : keys.ShiftLeft || keys.ShiftRight ? RUN : WALK;
    const sin = Math.sin(P.yaw), cos = Math.cos(P.yaw);
    let vx = -sin * f + cos * s, vz = -cos * f - sin * s;
    const len = Math.hypot(vx, vz) || 1;
    P.vx = (vx / len) * (f || s ? sp : 0);
    P.vz = (vz / len) * (f || s ? sp : 0);
    if (P.fly) {
      P.vy = (keys.Space ? FLY : 0) - (keys.ShiftLeft || keys.ShiftRight ? FLY : 0);
    } else {
      P.vy -= GRAVITY * dt;
      if (keys.Space && P.ground) P.vy = JUMP;
    }
    P.ground = false;
    move('x', P.vx * dt);
    move('z', P.vz * dt);
    move('y', P.vy * dt);
    if (P.y < -12) { toast('떨어졌어요! 다시 시작해요.'); spawnAt(respawn); }
    // 발밑 블록: 체크포인트·도착
    const under = Blocks.BY_NUM[get(Math.floor(P.x), Math.floor(P.y - 0.05), Math.floor(P.z))];
    if (under && P.ground) {
      if (under.id === 'check') {
        const c = [Math.floor(P.x) + 0.5, Math.floor(P.y), Math.floor(P.z) + 0.5];
        if (!respawn || respawn[0] !== c[0] || respawn[1] !== c[1] || respawn[2] !== c[2]) { respawn = c; toast('🚩 체크포인트! 떨어지면 여기서 다시 시작해요.'); }
      }
      if (under.id === 'goal' && o.onGoal && !finished) {
        finished = true;
        active = false;
        document.exitPointerLock();
        o.onGoal(Date.now() - startTime);
      }
    }
    pose();
    // 바라보는 블록에 테두리
    const hit = o.mode === 'build' ? ray() : null;
    outline.visible = !!hit;
    if (hit) outline.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    if (o.timer && !finished) hud.time.textContent = '⏱ ' + ((Date.now() - startTime) / 1000).toFixed(1) + '초';
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
      if (solid(x, y, z)) return { x, y, z, px, py, pz };
      px = x; py = y; pz = z;
      if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; }
      else if (ty < tz) { y += sy; t = ty; ty += tdy; }
      else { z += sz; t = tz; tz += tdz; }
    }
    return null;
  }

  const hotbarItems = () => Blocks.LIST.filter((b) => b.tier >= 0 && (o.inv[b.id] || 0) > 0).slice(0, 9);
  function drawHotbar() {
    if (o.mode !== 'build') { hud.bar.innerHTML = ''; return; }
    const items = hotbarItems();
    if (sel >= items.length) sel = Math.max(0, items.length - 1);
    hud.bar.innerHTML = items.length
      ? items.map((b, i) => `<div class="slot${i === sel ? ' on' : ''}" title="${b.name}">${Blocks.icon(b)}<b>${o.inv[b.id]}</b><i>${i + 1}</i></div>`).join('')
      : '<div class="empty">블록이 없어요. 끝말잇기로 모으거나 상점에서 사 오세요!</div>';
  }

  function breakBlock() {
    if (o.mode !== 'build') return toast('⛔ 모험 모드에서는 블록을 부술 수 없어요.');
    const h = ray();
    if (!h) return;
    const b = Blocks.BY_NUM[get(h.x, h.y, h.z)];
    if (b.tier < 0) return toast(`${b.name} 블록은 부술 수 없어요.`);
    vox[idx(h.x, h.y, h.z)] = 0;
    o.inv[b.id] = (o.inv[b.id] || 0) + 1;
    changed();
  }
  function placeBlock() {
    if (o.mode !== 'build') return toast('⛔ 모험 모드에서는 블록을 놓을 수 없어요.');
    const h = ray();
    const b = hotbarItems()[sel];
    if (!h || !b) return;
    if (!inside(h.px, h.py, h.pz)) return toast('세상 밖에는 놓을 수 없어요.');
    vox[idx(h.px, h.py, h.pz)] = b.num;
    if (hits(P.x, P.y, P.z)) { vox[idx(h.px, h.py, h.pz)] = 0; return; } // 내 몸이 있는 곳엔 못 놓는다
    o.inv[b.id]--;
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
      : 'WASD 이동 · 마우스/화살표 둘러보기 · 스페이스 점프 · 시프트 달리기 · Esc 멈춤';
    $('w3Switch').classList.toggle('hidden', !o.canSwitch);
    $('w3Switch').textContent = m === 'build' ? '🧭 모험 모드로 바꾸기' : '🔨 건축 모드로 바꾸기';
    drawHotbar();
  }
  function pose() {
    camera.position.set(P.x, P.y + EYE, P.z);
    camera.rotation.set(P.pitch, P.yaw, 0);
  }
  function spawnAt(p) {
    [P.x, P.y, P.z] = p;
    P.vx = P.vy = P.vz = 0;
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

  function open(opts) {
    if (!renderer) setup();
    o = opts;
    [W, H, D] = o.size;
    vox = o.data;
    finished = false;
    sel = 0;
    P.yaw = o.yaw || 0; P.pitch = 0; P.fly = false;
    respawn = o.spawn;
    spawnAt(o.spawn);
    scene.background = new THREE.Color(o.sky || '#8ec8ff');
    scene.fog = new THREE.Fog(o.sky || '#8ec8ff', 30, 90);
    hud.time.textContent = '';
    hud.time.classList.toggle('hidden', !o.timer);
    $('w3Title').textContent = o.title || '';
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
    if (o.onSave) o.onSave(vox);
    if (document.pointerLockElement === root) document.exitPointerLock();
    root.classList.add('hidden');
    if (o.onExit) o.onExit(byUser);
  }
  return { open, close };
})();

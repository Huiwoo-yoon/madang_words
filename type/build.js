// ===== 만들기: 캔 블록으로 구조물 짓기 (바이옴마다 따로 자동 저장) =====
const Build = (() => {
  const COLS = 24, ROWS = 14, CELL = 32; // 맨 아래 한 줄은 땅 (고정)
  const cv = $('world'), g = cv.getContext('2d');
  cv.width = COLS * CELL; cv.height = (ROWS + 1) * CELL;
  g.imageSmoothingEnabled = false;

  let tool = 'place', sel = null, recipe = null, hover = -1, down = false, lastCell = -1, savedTimer;

  $('biomeSel').innerHTML = Object.entries(BIOMES).map(([id, b]) => `<option value="${id}">${b.name}</option>`).join('');

  function world(biome = D.biome) {
    const w = D.worlds[biome];
    if (!w || w.length !== COLS * ROWS) D.worlds[biome] = Array(COLS * ROWS).fill('');
    return D.worlds[biome];
  }

  // ----- 그리기 -----
  function drawSky(g, b) {
    const cv = g.canvas;
    const sky = g.createLinearGradient(0, 0, 0, cv.height);
    sky.addColorStop(0, b.sky[0]); sky.addColorStop(1, b.sky[1]);
    g.fillStyle = sky; g.fillRect(0, 0, cv.width, cv.height);
    const r = seeded(7);
    if (b.deco.includes('sun')) { g.fillStyle = '#fff6a0'; g.fillRect(cv.width - 110, 24, 56, 56); }
    if (b.deco.includes('clouds')) {
      g.fillStyle = 'rgba(255,255,255,.85)';
      [[60, 40, 120], [300, 70, 90], [480, 30, 140]].forEach(([x, y, w]) => { g.fillRect(x, y, w, 20); g.fillRect(x + 20, y - 12, w - 50, 14); });
    }
    const dots = (n, colors, size) => {
      for (let i = 0; i < n; i++) {
        g.fillStyle = colors[Math.floor(r() * colors.length)];
        g.fillRect(Math.floor(r() * cv.width), Math.floor(r() * ROWS * CELL), size, size);
      }
    };
    if (b.deco.includes('snow')) dots(70, ['#ffffff', '#e8f2ff'], 4);
    if (b.deco.includes('embers')) dots(50, ['#ff9a3c', '#ffcf5a', '#ff5a2a'], 4);
    if (b.deco.includes('stars')) { dots(90, ['#ffffff', '#d9c6ff'], 2); g.fillStyle = '#e8e2c8'; g.fillRect(90, 40, 40, 40); }
  }

  function recipeCells(r, at) { // 클릭한 칸이 구조물의 아랫줄 가운데
    const H = r.shape.length, W = r.shape[0].length;
    const cx = at % COLS, cy = Math.floor(at / COLS), cells = [];
    r.shape.forEach((row, ry) => [...row].forEach((ch, rx) => {
      const id = r.key[ch];
      if (!id) return;
      const x = cx - Math.floor(W / 2) + rx, y = cy - (H - 1 - ry);
      cells.push({ x, y, id, i: y * COLS + x, ok: x >= 0 && x < COLS && y >= 0 && y < ROWS });
    }));
    return cells;
  }
  const missing = r => Object.entries(r.cost).filter(([id, n]) => (D.inv[id] || 0) < n).map(([id, n]) => `${BLOCK[id].name} ${n - (D.inv[id] || 0)}개`);
  const fits = cells => cells.every(c => c.ok && !world()[c.i]);

  // 하늘·격자·블록·땅 그리기 (구경하기 화면에서도 씀)
  function renderWorld(g, w, biome, grid) {
    const b = BIOMES[biome] || BIOMES.plains, cv = g.canvas;
    drawSky(g, b);
    if (grid) {
      g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 1;
      for (let x = 0; x <= COLS; x++) { g.beginPath(); g.moveTo(x * CELL + .5, 0); g.lineTo(x * CELL + .5, ROWS * CELL); g.stroke(); }
      for (let y = 0; y <= ROWS; y++) { g.beginPath(); g.moveTo(0, y * CELL + .5); g.lineTo(cv.width, y * CELL + .5); g.stroke(); }
    }
    (w || []).forEach((id, i) => {
      if (id && BLOCK[id]) g.drawImage(BLOCK[id].canvas, (i % COLS) * CELL, Math.floor(i / COLS) * CELL, CELL, CELL);
    });
    for (let x = 0; x < COLS; x++) g.drawImage(GROUNDS[b.ground], x * CELL, ROWS * CELL, CELL, CELL);
  }

  function draw() {
    renderWorld(g, world(), D.biome, true);

    if (hover < 0) return;
    const hx = (hover % COLS) * CELL, hy = Math.floor(hover / COLS) * CELL;
    if (tool === 'recipe' && recipe) {
      const cells = recipeCells(recipe, hover);
      const good = fits(cells) && !missing(recipe).length;
      g.globalAlpha = .55;
      cells.forEach(c => { if (c.ok) g.drawImage(BLOCK[c.id].canvas, c.x * CELL, c.y * CELL, CELL, CELL); });
      g.globalAlpha = .35;
      g.fillStyle = good ? '#3fff5a' : '#ff3f3f';
      cells.forEach(c => { if (c.ok) g.fillRect(c.x * CELL, c.y * CELL, CELL, CELL); });
      g.globalAlpha = 1;
      return;
    }
    if (tool === 'place' && sel && !world()[hover]) { g.globalAlpha = .5; g.drawImage(BLOCK[sel].canvas, hx, hy, CELL, CELL); g.globalAlpha = 1; }
    g.strokeStyle = tool === 'erase' ? '#ff4d4d' : '#fff'; g.lineWidth = 3;
    g.strokeRect(hx + 1.5, hy + 1.5, CELL - 3, CELL - 3);
  }

  function cellAt(e) {
    const r = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / r.width * COLS);
    const y = Math.floor((e.clientY - r.top) / r.height * (ROWS + 1));
    return x >= 0 && x < COLS && y >= 0 && y < ROWS ? y * COLS + x : -1;
  }
  function hint(msg) { $('buildHint').textContent = msg; }
  function cellCenter(i) {
    const r = cv.getBoundingClientRect(), s = r.width / COLS;
    return [r.left + (i % COLS + .5) * s, r.top + (Math.floor(i / COLS) + .5) * s];
  }

  // ----- 놓기 / 부수기 / 레시피로 짓기 -----
  function act(i, erase) {
    if (i < 0) return;
    const w = world();
    if (erase) {
      if (!w[i]) return;
      D.inv[w[i]] = (D.inv[w[i]] || 0) + 1;
      burst(...cellCenter(i), BLOCK[w[i]].colors, 8, 50);
      w[i] = '';
      sfx.break();
    } else if (tool === 'recipe') {
      if (!recipe) return hint('아래에서 레시피를 먼저 골라요!');
      const lack = missing(recipe), cells = recipeCells(recipe, i);
      if (lack.length) return hint(`재료가 모자라요: ${lack.join(', ')}. ⛏️ 캐기에서 더 캐 와요!`);
      if (!fits(cells)) return hint('여기엔 자리가 없어요. 빈 곳을 골라요!');
      cells.forEach(c => { w[c.i] = c.id; D.inv[c.id]--; });
      sfx.build(); confetti();
      hint(`${recipe.name} 완성! 🎉`);
      drawRecipes();
    } else {
      if (w[i]) return;
      if (!sel || !D.inv[sel]) {
        hint(sel ? `${BLOCK[sel].name} 블록이 없어요! ⛏️ 캐기에서 더 캐 와요.` : '아래에서 블록을 먼저 골라요!');
        return;
      }
      D.inv[sel]--;
      w[i] = sel;
      sfx.place();
    }
    changed();
  }

  function changed() {
    draw();
    drawPalette();
    $('saved').textContent = '💾 저장 중...';
    scheduleSave();
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => { $('saved').textContent = '💾 저장됨 ✓'; }, 1600);
  }

  function drawPalette() { $('palette').innerHTML = slotsHTML(false, sel); }

  function drawRecipes() {
    $('recipes').innerHTML = RECIPES.map(r => {
      const lack = missing(r);
      const cost = Object.entries(r.cost).map(([id, n]) => {
        const have = D.inv[id] || 0;
        return `<span class="${have < n ? 'lack' : ''}" title="${BLOCK[id].name}"><img src="${BLOCK[id].url}" alt="">${have}/${n}</span>`;
      }).join('');
      return `<button class="recipe${lack.length ? ' locked' : ' ready'}${recipe === r ? ' sel' : ''}" data-id="${r.id}">` +
        `<canvas data-preview="${r.id}" width="0" height="0"></canvas><span class="nm">${r.name}</span><span class="cost">${cost}</span>` +
        `<span>${lack.length ? '재료 모으는 중' : '✅ 지을 수 있어요!'}</span></button>`;
    }).join('');
    document.querySelectorAll('[data-preview]').forEach(c => { // 레시피 미리보기 그림
      const r = RECIPES.find(x => x.id === c.dataset.preview);
      const H = r.shape.length, W = r.shape[0].length, s = 16, n = Math.max(W, H);
      c.width = c.height = n * s;
      const pg = c.getContext('2d');
      pg.imageSmoothingEnabled = false;
      r.shape.forEach((row, y) => [...row].forEach((ch, x) => {
        const id = r.key[ch];
        if (id) pg.drawImage(BLOCK[id].canvas, (x + (n - W) / 2) * s, (y + n - H) * s, s, s);
      }));
    });
  }

  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    ac();
    down = true; cv.setPointerCapture(e.pointerId);
    const i = cellAt(e);
    lastCell = i;
    act(i, e.button === 2 || tool === 'erase');
  });
  cv.addEventListener('pointermove', e => {
    const i = cellAt(e);
    if (i !== hover) { hover = i; draw(); }
    if (down && i !== lastCell && tool !== 'recipe') { lastCell = i; act(i, e.buttons === 2 || tool === 'erase'); } // 끌면서 여러 칸
  });
  cv.addEventListener('pointerup', () => { down = false; });
  cv.addEventListener('pointerleave', () => { hover = -1; draw(); });

  $('palette').onclick = e => {
    const s = e.target.closest('.slot');
    if (!s) return;
    sel = s.dataset.id;
    setTool('place');
    hint(D.inv[sel] ? `${BLOCK[sel].name} 블록을 골랐어요. 빈 칸을 눌러 놓아요!` : `${BLOCK[sel].name} 블록이 아직 없어요. ⛏️ 캐기에서 캐 와요!`);
    drawPalette();
  };
  $('recipes').onclick = e => {
    const b = e.target.closest('.recipe');
    if (!b) return;
    recipe = RECIPES.find(r => r.id === b.dataset.id);
    const lack = missing(recipe);
    hint(lack.length ? `${recipe.name}: 재료가 모자라요 (${lack.join(', ')})` : `${recipe.name}: 지을 곳의 아랫줄 가운데를 눌러요!`);
    drawRecipes();
  };
  function setTool(t) {
    tool = t;
    document.querySelectorAll('#toolSeg button').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
    $('recipeBox').hidden = t !== 'recipe';
    $('paletteBox').hidden = t === 'recipe';
    if (t === 'recipe') { drawRecipes(); hint(recipe ? `${recipe.name}: 지을 곳을 눌러요!` : '레시피를 골라요. 재료가 다 있으면 한 번에 지어져요!'); }
  }
  document.querySelectorAll('#toolSeg button').forEach(b => b.onclick = () => { setTool(b.dataset.tool); draw(); });
  $('biomeSel').onchange = e => {
    D.biome = e.target.value;
    hint(`${BIOMES[D.biome].name}에 왔어요! 여기서 지은 것은 따로 저장돼요.`);
    draw(); scheduleSave();
  };
  $('clearBtn').onclick = () => {
    if (!confirm(`${BIOMES[D.biome].name}을(를) 모두 치울까요? 블록은 인벤토리로 돌아가요.`)) return;
    const w = world();
    w.forEach((id, i) => { if (id) { D.inv[id] = (D.inv[id] || 0) + 1; w[i] = ''; } });
    sfx.break();
    changed();
    if (tool === 'recipe') drawRecipes();
  };

  return {
    world,
    render(canvas, w, biome) { // 남의 건축물을 보기만 할 때
      canvas.width = COLS * CELL; canvas.height = (ROWS + 1) * CELL;
      const c = canvas.getContext('2d');
      c.imageSmoothingEnabled = false;
      renderWorld(c, w, biome, false);
    },
    open() {
      if (!BIOMES[D.biome]) D.biome = 'plains';
      $('biomeSel').value = D.biome;
      if (!sel || !D.inv[sel]) sel = BLOCKS.find(b => D.inv[b.id])?.id || null;
      $('saved').textContent = '💾 자동 저장돼요';
      setTool(tool);
      if (tool !== 'recipe') hint('블록을 고르고 빈 칸을 눌러서 놓아요. 오른쪽 클릭하면 부서져요.');
      draw();
      drawPalette();
    },
  };
})();

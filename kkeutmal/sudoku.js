// ===== 🔢 스도쿠: AI가 답이 하나뿐인 문제를 새로 만든다 =====
var ARCADE_GAMES = window.ARCADE_GAMES || {};
ARCADE_GAMES.sudoku = (() => {
  const HOLES = [36, 46, 54]; // 난이도별 빈칸 수

  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function canPut(g, i, v) {
    const r = Math.floor(i / 9), c = i % 9, br = r - (r % 3), bc = c - (c % 3);
    for (let k = 0; k < 9; k++) {
      if (g[r * 9 + k] === v || g[k * 9 + c] === v) return false;
      if (g[(br + Math.floor(k / 3)) * 9 + bc + (k % 3)] === v) return false;
    }
    return true;
  }
  // 빈칸을 채우는 방법의 수 (limit개까지만 센다). 후보가 가장 적은 칸부터 채워서 빠르다
  function countSolutions(g, limit) {
    let best = -1, bestOpts = null;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const opts = [];
      for (let v = 1; v <= 9; v++) if (canPut(g, i, v)) opts.push(v);
      if (!opts.length) return 0;
      if (!bestOpts || opts.length < bestOpts.length) { best = i; bestOpts = opts; }
    }
    if (best < 0) return 1;
    let n = 0;
    for (const v of bestOpts) {
      g[best] = v;
      n += countSolutions(g, limit - n);
      g[best] = 0;
      if (n >= limit) break;
    }
    return n;
  }
  function fill(g, i = 0) {
    if (i === 81) return true;
    if (g[i]) return fill(g, i + 1);
    for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      if (canPut(g, i, v)) { g[i] = v; if (fill(g, i + 1)) return true; g[i] = 0; }
    }
    return false;
  }
  function generate(holes) {
    const solution = new Array(81).fill(0);
    fill(solution);
    const puzzle = solution.slice();
    let removed = 0;
    for (const i of shuffle([...Array(81).keys()])) {
      if (removed >= holes) break;
      const v = puzzle[i];
      puzzle[i] = 0;
      if (countSolutions(puzzle.slice(), 2) === 1) removed++; else puzzle[i] = v;
    }
    return { puzzle, solution };
  }

  function start(el, lv, api) {
    const { puzzle, solution } = generate(HOLES[lv]);
    const grid = puzzle.slice();
    let sel = -1, mistakes = 0, done = false;
    const status = () => api.status(`❌ 틀린 횟수 ${mistakes}/3 · 남은 칸 ${grid.filter((v) => !v).length}`);

    el.innerHTML = `<div class="sd-grid"></div><div class="sd-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-n="${n}">${n}</button>`).join('')}</div>`;
    const gridEl = el.querySelector('.sd-grid');
    function render(wrongAt) {
      const selV = sel >= 0 ? grid[sel] : 0;
      gridEl.innerHTML = grid.map((v, i) => {
        const r = Math.floor(i / 9), c = i % 9;
        const cls = ['sd-cell', puzzle[i] ? 'given' : 'mine', i === sel ? 'sel' : '', selV && v === selV ? 'same' : '',
          i === wrongAt ? 'wrong' : '', c % 3 === 2 && c < 8 ? 'br' : '', r % 3 === 2 && r < 8 ? 'bb' : ''].join(' ');
        return `<div class="${cls}" data-i="${i}">${v || ''}</div>`;
      }).join('');
    }
    function put(n) {
      if (done || sel < 0 || grid[sel]) return;
      if (solution[sel] !== n) {
        mistakes++;
        render(sel);
        status();
        if (mistakes >= 3) { done = true; api.end('lose', '3번 틀려서 실패했어요.'); }
        return;
      }
      grid[sel] = n;
      render();
      status();
      if (grid.every((v) => v)) { done = true; api.end('win', '스도쿠를 다 풀었어요!'); }
    }
    gridEl.onclick = (e) => { const c = e.target.closest('[data-i]'); if (c) { sel = +c.dataset.i; render(); } };
    el.querySelector('.sd-pad').onclick = (e) => { const b = e.target.closest('[data-n]'); if (b) put(+b.dataset.n); };
    const myGame = A; // 다른 판이 시작되거나 이 판이 끝나면 키보드 입력을 그만 받는다
    const onKey = (e) => {
      if (A !== myGame || A.over || done) return document.removeEventListener('keydown', onKey);
      if (/^[1-9]$/.test(e.key)) put(+e.key);
    };
    document.addEventListener('keydown', onKey);
    render();
    status();
  }
  return { start };
})();

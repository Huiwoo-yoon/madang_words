// ===== ⚫ 오목: 나는 검은 돌(먼저), AI는 흰 돌 =====
var ARCADE_GAMES = window.ARCADE_GAMES || {};
ARCADE_GAMES.gomoku = (() => {
  const N = 15;
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const ME = 1, AI = 2;
  // 난이도별: 막기 비중, 공격 비중, 고르는 범위(위에서 몇 개 중 무작위)
  const LEVELS = [{ def: 0.5, atk: 1.0, top: 5 }, { def: 0.9, atk: 1.0, top: 2 }, { def: 1.0, atk: 1.1, top: 1 }];

  const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
  // (r,c)에 color 돌을 놓았다고 치고, 한 방향으로 이어진 개수와 열린 끝 수
  function line(b, r, c, color, dr, dc) {
    let cnt = 1, open = 0;
    for (const s of [1, -1]) {
      let rr = r + dr * s, cc = c + dc * s;
      while (inside(rr, cc) && b[rr][cc] === color) { cnt++; rr += dr * s; cc += dc * s; }
      if (inside(rr, cc) && !b[rr][cc]) open++;
    }
    return [cnt, open];
  }
  function cellScore(b, r, c, color) {
    let s = 0;
    for (const [dr, dc] of DIRS) {
      const [cnt, open] = line(b, r, c, color, dr, dc);
      if (cnt >= 5) s += 100000;
      else if (cnt === 4) s += open === 2 ? 10000 : open === 1 ? 1000 : 0;
      else if (cnt === 3) s += open === 2 ? 1000 : open === 1 ? 100 : 0;
      else if (cnt === 2) s += open === 2 ? 100 : open === 1 ? 10 : 0;
      else s += open;
    }
    return s;
  }
  const wins = (b, r, c, color) => DIRS.some(([dr, dc]) => line(b, r, c, color, dr, dc)[0] >= 5);

  function aiMove(b, lv) {
    const { def, atk, top } = LEVELS[lv];
    const cands = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (b[r][c]) continue;
      let near = false; // 돌 근처(2칸 안)만 생각한다
      for (let dr = -2; dr <= 2 && !near; dr++) for (let dc = -2; dc <= 2; dc++) {
        if (inside(r + dr, c + dc) && b[r + dr][c + dc]) { near = true; break; }
      }
      if (!near) continue;
      const mine = cellScore(b, r, c, AI);
      const score = mine >= 100000 ? 1e9 : atk * mine + def * cellScore(b, r, c, ME);
      cands.push({ r, c, score: score + Math.random() });
    }
    cands.sort((a, b2) => b2.score - a.score);
    if (cands[0].score >= 1e9) return cands[0]; // 이길 수 있으면 무조건 이긴다
    return cands[Math.floor(Math.random() * Math.min(top, cands.length))];
  }

  function start(el, lv, api) {
    const b = Array.from({ length: N }, () => new Array(N).fill(0));
    const myGame = A;
    let turn = ME, last = null, moves = 0;
    el.innerHTML = '<div class="gm-grid"></div>';
    const gridEl = el.querySelector('.gm-grid');
    function render() {
      let html = '';
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const v = b[r][c];
        const isLast = last && last.r === r && last.c === c;
        html += `<div class="gm-cell" data-r="${r}" data-c="${c}">${v ? `<span class="stone ${v === ME ? 'black' : 'white'}${isLast ? ' last' : ''}"></span>` : ''}</div>`;
      }
      gridEl.innerHTML = html;
    }
    function place(r, c, who) {
      b[r][c] = who; last = { r, c }; moves++;
      render();
      if (wins(b, r, c, who)) { api.end(who === ME ? 'win' : 'lose', who === ME ? '다섯 개를 한 줄로 놓았어요!' : 'AI가 먼저 다섯 개를 놓았어요.'); return true; }
      if (moves === N * N) { api.end('draw', '판이 꽉 찼어요.'); return true; }
      return false;
    }
    gridEl.onclick = (e) => {
      const cell = e.target.closest('[data-r]');
      if (!cell || turn !== ME || A !== myGame || A.over) return;
      const r = +cell.dataset.r, c = +cell.dataset.c;
      if (b[r][c]) return;
      if (place(r, c, ME)) return;
      turn = AI;
      api.status('🤖 AI가 생각 중…');
      setTimeout(() => {
        if (A !== myGame || A.over) return;
        const m = aiMove(b, lv);
        if (place(m.r, m.c, AI)) return;
        turn = ME;
        api.status('⚫ 내 차례예요. 빈 곳을 눌러 돌을 놓으세요.');
      }, 400);
    };
    render();
    api.status('⚫ 내가 먼저! 빈 곳을 눌러 돌을 놓으세요.');
  }
  return { start };
})();

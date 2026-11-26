// ===== ♟️ 체스: 나는 흰색(아래), AI는 검은색 =====
// 판: 칸 번호 0~63, 0번이 왼쪽 위(a8), 63번이 오른쪽 아래(h1). 대문자 = 흰색, 소문자 = 검은색
var ARCADE_GAMES = window.ARCADE_GAMES || {};
ARCADE_GAMES.chess = (() => {
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const KING = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // 난이도별: 몇 수 앞까지 보는지, 실수(무작위 점수 흔들기) 크기
  const LEVELS = [{ depth: 1, noise: 250 }, { depth: 2, noise: 40 }, { depth: 4, noise: 0 }];
  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

  const colorOf = (p) => (p ? (p === p.toUpperCase() ? 'w' : 'b') : null);
  const other = (c) => (c === 'w' ? 'b' : 'w');
  const ok = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const forColor = (ch, color) => (color === 'w' ? ch.toUpperCase() : ch);

  function initial() {
    const b = 'rnbqkbnrpppppppp' + '.'.repeat(32) + 'PPPPPPPPRNBQKBNR';
    return { b: b.split('').map((x) => (x === '.' ? null : x)), turn: 'w', castle: { K: 1, Q: 1, k: 1, q: 1 }, ep: -1 };
  }

  // sq 칸을 by 색이 공격하고 있나?
  function attacked(b, sq, by) {
    const r = sq >> 3, c = sq & 7;
    const d = by === 'w' ? 1 : -1; // 흰 폰은 위로 공격하므로 공격하는 폰은 한 줄 아래에 있다
    for (const dc of [-1, 1]) if (ok(r + d, c + dc) && b[(r + d) * 8 + c + dc] === forColor('p', by)) return true;
    for (const [dr, dc] of KNIGHT) if (ok(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === forColor('n', by)) return true;
    for (const [dr, dc] of KING) if (ok(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === forColor('k', by)) return true;
    for (const [dirs, kinds] of [[DIAG, 'bq'], [ORTH, 'rq']]) {
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (ok(rr, cc)) {
          const p = b[rr * 8 + cc];
          if (p) { if (colorOf(p) === by && kinds.includes(p.toLowerCase())) return true; break; }
          rr += dr; cc += dc;
        }
      }
    }
    return false;
  }
  const kingSq = (b, color) => b.indexOf(forColor('k', color));
  const inCheck = (st) => attacked(st.b, kingSq(st.b, st.turn), other(st.turn));

  function pseudo(st) {
    const { b, turn: me } = st, foe = other(me), out = [];
    const add = (from, to, extra) => out.push({ from, to, cap: b[to], ...extra });
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq];
      if (!p || colorOf(p) !== me) continue;
      const t = p.toLowerCase(), r = sq >> 3, c = sq & 7;
      if (t === 'p') {
        const d = me === 'w' ? -1 : 1, startRow = me === 'w' ? 6 : 1, lastRow = me === 'w' ? 0 : 7;
        const one = (r + d) * 8 + c;
        if (ok(r + d, c) && !b[one]) {
          add(sq, one, { promo: r + d === lastRow });
          if (r === startRow && !b[(r + 2 * d) * 8 + c]) add(sq, (r + 2 * d) * 8 + c);
        }
        for (const dc of [-1, 1]) {
          if (!ok(r + d, c + dc)) continue;
          const to = (r + d) * 8 + c + dc;
          if (b[to] && colorOf(b[to]) === foe) add(sq, to, { promo: r + d === lastRow });
          else if (to === st.ep) out.push({ from: sq, to, cap: forColor('p', foe), ep: true });
        }
      } else if (t === 'n' || t === 'k') {
        for (const [dr, dc] of t === 'n' ? KNIGHT : KING) {
          if (!ok(r + dr, c + dc)) continue;
          const to = (r + dr) * 8 + c + dc;
          if (!b[to] || colorOf(b[to]) === foe) add(sq, to);
        }
        if (t === 'k') { // 캐슬링: 왕과 룩이 안 움직였고, 사이가 비었고, 왕이 지나가는 칸이 공격받지 않을 때
          const home = me === 'w' ? 60 : 4, R = forColor('r', me);
          const [kSide, qSide] = me === 'w' ? ['K', 'Q'] : ['k', 'q'];
          if (sq === home && st.castle[kSide] && !b[home + 1] && !b[home + 2] && b[home + 3] === R &&
            ![home, home + 1, home + 2].some((s) => attacked(b, s, foe))) out.push({ from: sq, to: home + 2, castle: kSide });
          if (sq === home && st.castle[qSide] && !b[home - 1] && !b[home - 2] && !b[home - 3] && b[home - 4] === R &&
            ![home, home - 1, home - 2].some((s) => attacked(b, s, foe))) out.push({ from: sq, to: home - 2, castle: qSide });
        }
      } else {
        const dirs = t === 'b' ? DIAG : t === 'r' ? ORTH : DIAG.concat(ORTH);
        for (const [dr, dc] of dirs) {
          let rr = r + dr, cc = c + dc;
          while (ok(rr, cc)) {
            const to = rr * 8 + cc;
            if (b[to]) { if (colorOf(b[to]) === foe) add(sq, to); break; }
            add(sq, to);
            rr += dr; cc += dc;
          }
        }
      }
    }
    return out;
  }

  function make(st, m) {
    const b = st.b.slice(), p = b[m.from];
    b[m.to] = m.promo ? forColor('q', st.turn) : p; // 끝줄에 간 폰은 퀸이 된다
    b[m.from] = null;
    if (m.ep) b[m.to + (st.turn === 'w' ? 8 : -8)] = null;
    if (m.castle) {
      const [rf, rt] = { K: [63, 61], Q: [56, 59], k: [7, 5], q: [0, 3] }[m.castle];
      b[rt] = b[rf]; b[rf] = null;
    }
    const castle = { ...st.castle };
    if (p === 'K') castle.K = castle.Q = 0;
    if (p === 'k') castle.k = castle.q = 0;
    for (const [s, key] of [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']]) if (m.from === s || m.to === s) castle[key] = 0;
    const ep = p.toLowerCase() === 'p' && Math.abs(m.to - m.from) === 16 ? (m.from + m.to) / 2 : -1;
    return { b, turn: other(st.turn), castle, ep };
  }
  const legal = (st) => pseudo(st).filter((m) => { const n = make(st, m); return !attacked(n.b, kingSq(n.b, st.turn), n.turn); });

  // 점수(흰색 기준): 기물 값 + 폰은 앞으로 갈수록, 나이트·비숍은 가운데일수록 좋다
  function evaluate(b) {
    let s = 0;
    for (let sq = 0; sq < 64; sq++) {
      const p = b[sq];
      if (!p) continue;
      const t = p.toLowerCase(), r = sq >> 3, c = sq & 7, white = p !== t;
      let v = VAL[t];
      if (t === 'p') v += (white ? 6 - r : r - 1) * 8;
      if (t === 'n' || t === 'b') v -= (Math.abs(3.5 - r) + Math.abs(3.5 - c)) * 6;
      s += white ? v : -v;
    }
    return s;
  }
  const capValue = (m) => (m.cap ? VAL[m.cap.toLowerCase()] : 0);
  function search(st, depth, alpha, beta) {
    if (depth === 0) return st.turn === 'w' ? evaluate(st.b) : -evaluate(st.b);
    const moves = legal(st);
    if (!moves.length) return inCheck(st) ? -100000 - depth : 0;
    moves.sort((x, y) => capValue(y) - capValue(x));
    for (const m of moves) {
      const v = -search(make(st, m), depth - 1, -beta, -alpha);
      if (v >= beta) return beta;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }
  function bestMove(st, lv) {
    const { depth, noise } = LEVELS[lv];
    const moves = legal(st).sort((x, y) => capValue(y) - capValue(x));
    let best = null, bestScore = -Infinity;
    for (const m of moves) {
      const v = -search(make(st, m), depth - 1, -Infinity, noise ? Infinity : -bestScore) + Math.random() * noise;
      if (v > bestScore) { bestScore = v; best = m; }
    }
    return best;
  }

  function start(el, lv, api) {
    let st = initial(), sel = -1, targets = [], last = null, plies = 0, thinking = false;
    const myGame = A;
    el.innerHTML = '<div class="ch-grid"></div>';
    const gridEl = el.querySelector('.ch-grid');
    function render() {
      const checkSq = inCheck(st) ? kingSq(st.b, st.turn) : -1;
      gridEl.innerHTML = st.b.map((p, sq) => {
        const r = sq >> 3, c = sq & 7;
        const cls = ['ch-cell', (r + c) % 2 ? 'dark' : 'light', sq === sel ? 'sel' : '',
          last && (sq === last.from || sq === last.to) ? 'last' : '', sq === checkSq ? 'check' : '',
          targets.some((m) => m.to === sq) ? (p ? 'target cap' : 'target') : ''].join(' ');
        return `<div class="${cls}" data-sq="${sq}">${p ? `<span class="pc ${colorOf(p)}">${GLYPH[p.toLowerCase()]}︎</span>` : ''}</div>`;
      }).join('');
    }
    // 수를 둔 뒤: 체크메이트·스테일메이트·무승부 확인
    function afterMove() {
      plies++;
      render();
      const moves = legal(st);
      const pieces = st.b.filter(Boolean);
      if (!moves.length) {
        if (inCheck(st)) api.end(st.turn === 'b' ? 'win' : 'lose', st.turn === 'b' ? '체크메이트! AI 왕을 잡았어요.' : '체크메이트… AI가 내 왕을 잡았어요.');
        else api.end('draw', '스테일메이트: 둘 곳이 없어서 비겼어요.');
        return true;
      }
      if (pieces.length === 2) { api.end('draw', '왕만 남아서 비겼어요.'); return true; }
      if (plies >= 200) { api.end('draw', '너무 오래 걸려서 비겼어요.'); return true; }
      return false;
    }
    function aiTurn() {
      thinking = true;
      api.status('🤖 AI가 생각 중…');
      setTimeout(() => {
        if (A !== myGame || A.over) return;
        const m = bestMove(st, lv);
        if (m.cap) Sfx.play('ttak'); else Sfx.play('place', 'wood');
        st = make(st, m);
        last = m;
        thinking = false;
        if (!afterMove()) api.status(inCheck(st) ? '⚠️ 체크! 왕을 지켜요.' : '⚪ 내 차례예요. 움직일 말을 누르세요.');
      }, 300);
    }
    gridEl.onclick = (e) => {
      const cell = e.target.closest('[data-sq]');
      if (!cell || thinking || st.turn !== 'w' || A !== myGame || A.over) return;
      const sq = +cell.dataset.sq;
      const move = targets.find((m) => m.to === sq);
      if (move) {
        if (move.cap) Sfx.play('ttak'); else Sfx.play('place', 'wood');
        st = make(st, move);
        last = move; sel = -1; targets = [];
        if (!afterMove()) aiTurn();
        return;
      }
      if (colorOf(st.b[sq]) === 'w') { sel = sq; targets = legal(st).filter((m) => m.from === sq); }
      else { sel = -1; targets = []; }
      render();
    };
    render();
    api.status('⚪ 내가 흰색, 먼저 둬요. 움직일 말을 누르세요.');
  }
  return { start };
})();

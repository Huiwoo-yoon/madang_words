// ===== 🎲 미니게임: 돈을 내고 AI와 한 판. 이기면 상금! =====
// 게임마다 ARCADE_GAMES[id].start(판 요소, 난이도 번호, api)로 시작한다.
// api.status(글) — 위쪽 안내 글, api.end('win' | 'lose' | 'draw', 이유)
const ARCADE = [
  { id: 'sudoku', emoji: '🔢', name: '스도쿠', desc: 'AI가 낸 문제를 풀어요. 3번 틀리면 실패!',
    levels: [{ name: '쉬움', fee: 200, reward: 600 }, { name: '보통', fee: 500, reward: 2000 }, { name: '어려움', fee: 1000, reward: 5000 }] },
  { id: 'gomoku', emoji: '⚫', name: '오목', desc: 'AI보다 먼저 돌 다섯 개를 한 줄로 놓아요.',
    levels: [{ name: '쉬움', fee: 200, reward: 500 }, { name: '보통', fee: 500, reward: 1500 }, { name: '어려움', fee: 1000, reward: 4000 }] },
  { id: 'chess', emoji: '♟️', name: '체스', desc: 'AI 왕을 체크메이트! 비기면 참가비를 돌려받아요.',
    levels: [{ name: '쉬움', fee: 300, reward: 800 }, { name: '보통', fee: 800, reward: 3000 }, { name: '어려움', fee: 2000, reward: 10000 }] },
];

let A = null; // 지금 하는 미니게임 { game, lv, over }

function showArcade() {
  renderTop();
  $('arcadeMsg').textContent = '';
  $('arcadeList').innerHTML = ARCADE.map((g) => `
    <div class="ag">
      <div class="ag-head"><span class="ie">${g.emoji}</span><div><b>${g.name}</b><span>${g.desc}</span></div></div>
      <div class="ag-levels">${g.levels.map((l, i) => `
        <button class="lvbtn" data-game="${g.id}" data-lv="${i}">
          <b>${l.name}</b><small>참가비 ${won(l.fee)}</small><small class="rw">이기면 ${won(l.reward)}</small>
        </button>`).join('')}</div>
    </div>`).join('');
  show('arcade');
}

function startArcade(id, lv) {
  const g = ARCADE.find((x) => x.id === id);
  const level = g.levels[lv];
  if (S.money < level.fee) { $('arcadeMsg').textContent = `${won(level.fee - S.money)}가 모자라요.`; return; }
  S.money -= level.fee;
  save();
  renderTop();
  A = { game: g, lv, over: false };
  $('agTitle').textContent = `${g.emoji} ${g.name} · ${level.name}`;
  $('agStatus').textContent = '';
  $('agBoard').innerHTML = '';
  $('agBoard').className = 'ag-board ' + id;
  show('arcadeGame');
  ARCADE_GAMES[id].start($('agBoard'), lv, {
    status: (t) => { $('agStatus').textContent = t; },
    end: (result, why) => endArcade(result, why),
  });
}

function endArcade(result, why) {
  if (!A || A.over) return;
  A.over = true;
  const level = A.game.levels[A.lv];
  let head;
  if (result === 'win') { S.money += level.reward; head = `<div class="big">🎉</div><h2>이겼다!</h2><p class="gain">${ICON.gem} +${won(level.reward)}</p>`; }
  else if (result === 'draw') { S.money += level.fee; head = `<div class="big">🤝</div><h2>비겼어요</h2><p class="gain">참가비 ${won(level.fee)}을 돌려받았어요.</p>`; }
  else head = `<div class="big">😢</div><h2>졌어요…</h2>`;
  save();
  renderTop();
  $('modal').innerHTML = `${head}${why ? `<p>${why}</p>` : ''}
    <button class="btn primary" data-act="again">한 판 더 (참가비 ${won(level.fee)})</button>
    <button class="btn ghost" data-act="arcade">미니게임 목록</button>`;
  setTimeout(() => $('overlay').classList.remove('hidden'), 700);
}

$('arcadeBtn').onclick = showArcade;
$('arcadeBack').onclick = renderHome;
$('arcadeList').onclick = (e) => { const b = e.target.closest('[data-game]'); if (b) startArcade(b.dataset.game, +b.dataset.lv); };
$('agGiveUp').onclick = () => { if (A && !A.over && confirm('포기하면 참가비는 돌려받지 못해요. 포기할까요?')) endArcade('lose', '포기했어요.'); };

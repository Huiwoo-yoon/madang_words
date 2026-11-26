// ===== 🎮 놀이터: 블록 64개로 10분 이용권을 사서 다른 게임을 한다 =====
// 이용권은 남은 시간(ms)으로 저장돼서 (D.ticketMs) 게임 창을 열어 둔 동안만 줄어든다. 하루 30분 제한과는 따로 센다.
const Arcade = (() => {
  const PRICE = 64;                 // 블록 몇 개를 내는지
  const GEM_PRICE = 500;            // 또는 💎 에메랄드 몇 개를 내는지
  const TICKET_MS = 10 * 60000;     // 한 번 사면 몇 분 놀 수 있는지
  const GAMES = [
    { id: 'yut', name: '🎲 윷마블', url: 'yutmarble/', desc: '윷을 던져 땅을 사는 보드게임. 한 화면에서 2~4명이 번갈아 해요.' },
    { id: 'ttakji', name: '🃏 딱지치기', url: '../ttakji/index.html', desc: '딱지를 뒤집어 포인트를 모으고 대마왕에 도전해요.' },
    { id: 'tuho', name: '🏺 투호', url: '../tuho/index.html', desc: '화살을 던져 항아리에 쏙! 타이밍을 맞춰요.' },
  ];
  let current = null, savedAt = 0;

  const minable = BLOCKS.filter(b => b.lvl > 0); // 작업대에서 만든 가구·장식(lvl 0)은 이용권 값으로 내지 않는다
  const have = () => minable.reduce((a, b) => a + (D.inv[b.id] || 0), 0);
  const fmt = ms => { const s = Math.ceil(Math.max(0, ms) / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  function draw() {
    const n = have(), ok = n >= PRICE;
    $('arcadeTime').textContent = D.ticketMs > 0 ? `🎟️ 이용권 남은 시간 ${fmt(D.ticketMs)}` : '🎟️ 이용권이 없어요';
    $('buyTicket').disabled = !ok;
    $('buyTicket').textContent = `🎟️ 블록 ${PRICE}개 내고 ${TICKET_MS / 60000}분 이용권 받기`;
    $('buyTicketGem').disabled = (ME.points || 0) < GEM_PRICE;
    $('buyTicketGem').textContent = `💎 에메랄드 ${GEM_PRICE}개 내고 ${TICKET_MS / 60000}분 이용권 받기 (내 에메랄드 ${(ME.points || 0).toLocaleString('ko-KR')})`;
    $('arcadeNeed').textContent = ok ? `내 블록 ${n}개 → 사면 ${n - PRICE}개가 남아요. (흔한 블록부터 써요)` : `블록이 ${PRICE - n}개 모자라요. (내 블록 ${n}개) ⛏️ 캐기에서 더 캐 와요!`;
    $('arcadeGames').innerHTML = GAMES.map(g =>
      `<button class="game${D.ticketMs > 0 ? '' : ' locked'}" data-id="${g.id}"><span class="nm">${g.name}</span><span>${g.desc}</span></button>`).join('');
  }

  function buy() {
    if (have() < PRICE) return;
    if (!confirm(`블록 ${PRICE}개를 내고 ${TICKET_MS / 60000}분 이용권을 받을까요?\n(흔한 블록부터 쓰고, 귀한 블록은 아껴 둬요)`)) return;
    let left = PRICE;
    [...minable].sort((a, b) => a.lvl - b.lvl).forEach(b => { // 낮은 단계 블록부터 낸다
      const take = Math.min(D.inv[b.id] || 0, left);
      if (take) { D.inv[b.id] -= take; left -= take; }
    });
    give();
  }
  function buyGem() {
    if ((ME.points || 0) < GEM_PRICE) return;
    if (!confirm(`에메랄드 ${GEM_PRICE}개를 내고 ${TICKET_MS / 60000}분 이용권을 받을까요?`)) return;
    ME.points -= GEM_PRICE;
    updateStats();
    give();
  }
  function give() {
    D.ticketMs = (D.ticketMs || 0) + TICKET_MS;
    saveNow();
    sfx.levelUp(); confetti();
    popup('🎟️ 이용권 도착!', `${TICKET_MS / 60000}분 동안 놀 수 있어요`);
    draw();
  }

  function play(id) {
    if (!(D.ticketMs > 0)) { popup('🎟️ 이용권이 필요해요', `블록 ${PRICE}개로 받을 수 있어요`); return; }
    current = GAMES.find(g => g.id === id);
    $('gameTitle').textContent = current.name;
    $('gameFrame').src = current.url;
    $('gameNew').href = current.url;
    $('gameBox').hidden = false;
    input.blur();
    tick(0);
  }

  function close() {
    if (!current) return;
    current = null;
    $('gameBox').hidden = true;
    $('gameFrame').src = 'about:blank'; // 소리·타이머도 같이 멈추게
    saveNow();
    if (view === 'arcade') draw();
  }

  // 1초마다 game.js의 타이머에서 부른다: 게임 창이 열려 있고 화면이 보일 때만 이용권이 줄어든다
  function tick(ms = 1000) {
    if (!current || !D) return;
    if (document.visibilityState === 'visible') D.ticketMs -= ms;
    $('gameLeft').textContent = `⏱️ ${fmt(D.ticketMs)}`;
    $('gameLeft').classList.toggle('low', D.ticketMs <= 60000);
    if (D.ticketMs <= 0) {
      D.ticketMs = 0;
      close();
      sfx.levelUp();
      popup('⏰ 이용권 끝!', `더 놀려면 블록 ${PRICE}개로 새 이용권을 받아요`);
      return;
    }
    if (++savedAt % 15 === 0) scheduleSave(); // 닫지 않고 창을 끄더라도 남은 시간이 거의 맞게
  }

  $('buyTicket').onclick = buy;
  $('buyTicketGem').onclick = buyGem;
  $('arcadeGames').onclick = e => { const b = e.target.closest('.game'); if (b) play(b.dataset.id); };
  $('gameExit').onclick = close;

  return { open: draw, tick, close };
})();

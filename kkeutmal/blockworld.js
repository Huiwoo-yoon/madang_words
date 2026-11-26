// ===== 🧱 블록 세상 화면: 내 세계(건축/모험), 파쿠르, 미로, 내 블록 =====
const BlockWorld = (() => {
  let lastCourse = null; // 다시 하기용 ['p'|'m', 레벨]
  const fmt = (ms) => (ms / 1000).toFixed(1) + '초';
  const courseReward = (lv, first) => (first ? 500 * lv : 50 * lv);

  function render() {
    renderTop();
    const course = (kind, n, label) => Array.from({ length: n }, (_, i) => {
      const lv = i + 1, key = kind + lv;
      const locked = lv > 1 && !S.cleared[kind + (lv - 1)];
      const done = S.cleared[key];
      return `<button class="lvbtn" data-course="${kind}" data-lv="${lv}" ${locked ? 'disabled' : ''}>
        <b>${locked ? '🔒' : done ? '✔' : ''} ${label} ${lv}</b>
        <small>${done ? `최고 ${fmt(S.times[key])}` : locked ? '앞 레벨을 깨면 열려요' : '처음 깨면'}</small>
        <small class="rw">${done ? `다시 깨면 ${won(courseReward(lv, false))}` : `${won(courseReward(lv, true))} + 블록`}</small>
      </button>`;
    }).join('');
    const owned = Blocks.LIST.filter((b) => (S.inv[b.id] || 0) > 0);
    $('bwList').innerHTML = `
      <div class="ag">
        <div class="ag-head"><span class="ie">🏠</span><div><b>내 세계</b><span>모은 블록으로 마음대로 지어요. 모험 모드에서는 부술 수 없어요.</span></div></div>
        <div class="bw-two">
          <button class="btn primary" data-mine="build">🔨 건축 모드</button>
          <button class="btn" data-mine="adventure">🧭 모험 모드</button>
        </div>
      </div>
      <div class="ag">
        <div class="ag-head"><span class="ie">🏃</span><div><b>파쿠르</b><span>떠 있는 발판을 뛰어 건너 초록 도착 블록까지! 떨어지면 노란 체크포인트에서 다시 시작해요.</span></div></div>
        <div class="ag-levels five">${course('p', Maps.PARKOUR_LEVELS, '파쿠르')}</div>
      </div>
      <div class="ag">
        <div class="ag-head"><span class="ie">🌀</span><div><b>미로</b><span>벽 사이 길을 찾아 초록 도착 블록을 밟아요. 할 때마다 길이 바뀌어요.</span></div></div>
        <div class="ag-levels five">${course('m', Maps.MAZE_LEVELS, '미로')}</div>
      </div>
      <div class="ag">
        <div class="ag-head"><span class="ie">🎒</span><div><b>내 블록</b><span>끝말잇기 단어마다 1개, 이기면 더! 상점에서 살 수도 있어요.</span></div></div>
        <div class="bw-inv">${owned.length ? owned.map((b) => `<div class="slot" title="${b.name}">${Blocks.icon(b)}<b>${S.inv[b.id]}</b></div>`).join('') : '<p>아직 블록이 없어요.</p>'}</div>
      </div>
      <p class="bw-note">💻 키보드와 마우스가 있는 컴퓨터에서 해요. 화면을 누르면 시작하고, Esc를 누르면 멈춰요.</p>`;
    show('blocks');
  }

  function openMine(mode) {
    const m = Maps.myWorld(S.world);
    World3D.open({
      ...m, title: '🏠 내 세계', mode, canSwitch: true, inv: S.inv,
      onSave: (data) => { S.world = Maps.pack(data); save(); },
      onExit: render,
    });
  }
  function openCourse(kind, lv) {
    lastCourse = [kind, lv];
    const m = kind === 'p' ? Maps.parkour(lv) : Maps.maze(lv);
    World3D.open({
      ...m, title: `${kind === 'p' ? '🏃 파쿠르' : '🌀 미로'} ${lv}`, mode: 'adventure', canSwitch: false, inv: S.inv,
      onGoal: (ms) => finish(kind, lv, ms),
      onExit: render,
    });
  }

  function finish(kind, lv, ms) {
    const key = kind + lv, first = !S.cleared[key];
    const reward = courseReward(lv, first);
    S.money += reward;
    const got = [];
    if (first) for (let i = 0; i < 2 + lv; i++) { const b = Blocks.randomOfTier(Math.min(4, 1 + Math.floor(lv / 2) + (i % 2))); S.inv[b.id] = (S.inv[b.id] || 0) + 1; got.push(b); }
    const best = !S.times[key] || ms < S.times[key];
    if (best) S.times[key] = ms;
    S.cleared[key] = true;
    save();
    World3D.close(false);
    $('modal').innerHTML = `<div class="big">🏁</div><h2>${kind === 'p' ? '파쿠르' : '미로'} ${lv} 도착!</h2>
      <p>⏱ ${fmt(ms)}${best ? ' · 🏅 최고 기록!' : ''}</p>
      <p class="gain">${ICON.gem} +${won(reward)}</p>
      ${got.length ? `<p class="sub">받은 블록: ${got.map((b) => Blocks.icon(b)).join(' ')}</p>` : ''}
      <button class="btn primary" data-act="bwAgain">다시 하기</button>
      <button class="btn ghost" data-act="blocks">블록 세상</button>`;
    $('overlay').classList.remove('hidden');
  }

  $('bwBack').onclick = renderHome;
  $('bwList').onclick = (e) => {
    const m = e.target.closest('[data-mine]');
    if (m) return openMine(m.dataset.mine);
    const c = e.target.closest('[data-course]');
    if (c && !c.disabled) openCourse(c.dataset.course, +c.dataset.lv);
  };
  $('blocksBtn').onclick = render;

  return { render, again: () => lastCourse && openCourse(...lastCourse) };
})();

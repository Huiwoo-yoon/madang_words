// ===== 🧱 블록 세상 화면: 내 세계(건축/모험), 🌍 모두의 맵, 파쿠르, 미로, 내 블록 =====
// 내 맵 올리기: 내 세계에 출발·도착 블록을 놓고 → 모험 모드로 직접 깨면 → 올릴 수 있다 (깰 수 없는 맵을 막으려고)
// 모두의 맵: 하기는 공짜. 남의 맵을 처음 깨면 50 에메랄드, 만든 사람은 누가 처음 깰 때마다 10 (💎 받기)
const BlockWorld = (() => {
  let lastCourse = null; // 다시 하기용: ['p'|'m', 레벨] 또는 ['u', 맵 번호]
  const fmt = (ms) => (ms / 1000).toFixed(1) + '초';
  const courseReward = (lv, first) => (first ? 500 * lv : 50 * lv);
  const KIND = { parkour: '🏃 파쿠르', maze: '🌀 미로', free: '🏞️ 자유' };
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
        <div class="ag-head"><span class="ie">🏠</span><div><b>내 세계</b><span>모은 블록으로 마음대로 지어요. 출발·체크포인트·도착 블록은 공짜로 놓을 수 있어서, 나만의 파쿠르·미로를 만들 수 있어요.</span></div></div>
        <div class="bw-two">
          <button class="btn primary" data-mine="build">🔨 건축 모드</button>
          <button class="btn" data-mine="adventure">🧭 모험 모드 (시험해 보기)</button>
        </div>
        <div class="bw-status">${mineStatus()}</div>
      </div>
      <div class="ag">
        <div class="ag-head"><span class="ie">🌍</span><div><b>모두의 맵</b><span>다른 사람이 만든 맵을 공짜로 해요. 남의 맵을 처음 깨면 ${won(50)}, 내 맵을 누가 처음 깨면 나도 ${won(10)}!</span></div></div>
        <div id="bwShared" class="bw-shared">불러오는 중…</div>
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
        <div class="ag-head"><span class="ie">🎒</span><div><b>내 블록</b><span>끝말잇기·타자연습에서 모으고, 상점에서 살 수도 있어요.</span></div></div>
        <div class="bw-inv">${owned.length ? owned.map((b) => `<div class="slot" title="${b.name}">${Blocks.icon(b)}<b>${S.inv[b.id]}</b></div>`).join('') : '<p>아직 블록이 없어요.</p>'}</div>
      </div>
      <p class="bw-note">💻 키보드와 마우스가 있는 컴퓨터에서 해요. 화면을 누르면 시작하고, Esc를 누르면 멈춰요.</p>`;
    show('blocks');
    loadShared();
  }

  // ----- 내 세계 → 맵으로 올리기 -----
  function mineStatus() {
    const m = Maps.myWorld(S.world);
    if (!Maps.has(m.data, 'start') || !Maps.has(m.data, 'goal'))
      return '📤 맵으로 올리려면: 건축 모드에서 <b>출발</b> 블록과 <b>도착</b> 블록을 놓아요 (핫바 맨 끝, 공짜).';
    if (S.verified !== Maps.fingerprint(m.data))
      return '📤 이제 🧭 모험 모드로 출발부터 도착까지 직접 깨 보세요. 깨면 올릴 수 있어요. (고치면 다시 깨야 해요)';
    return '✅ 내가 깬 맵이에요! <button class="btn primary small" data-bw="publishForm">📤 모두의 맵에 올리기</button>';
  }
  function openMine(mode) {
    const m = Maps.myWorld(S.world);
    World3D.open({
      ...m, spawn: (mode === 'adventure' && Maps.startOf(m.size, m.data)) || m.spawn,
      title: '🏠 내 세계', mode, canSwitch: true, tools: true, timer: mode === 'adventure', inv: S.inv,
      onSave: (data) => { S.world = Maps.pack(data); save(); },
      onGoal: () => { // 모험 모드로 도착까지 왔다 → 이 모양 그대로면 올릴 수 있다
        S.world = Maps.pack(m.data);
        S.verified = Maps.fingerprint(m.data);
        save();
        World3D.close(false);
        modal(`<div class="big">🏁</div><h2>내 맵을 깼어요!</h2><p>이제 모두의 맵에 올릴 수 있어요.</p>
          <button class="btn primary" data-act="bw:publishForm">📤 올리기</button><button class="btn ghost" data-act="blocks">나중에</button>`);
      },
      onExit: render,
    });
  }
  function publishForm() {
    modal(`<div class="big">📤</div><h2>모두의 맵에 올리기</h2>
      <p><input id="mapTitle" class="bw-input" maxlength="20" placeholder="맵 이름 (20자까지)"></p>
      <p><select id="mapKind" class="bw-input"><option value="parkour">🏃 파쿠르</option><option value="maze">🌀 미로</option><option value="free">🏞️ 자유</option></select></p>
      <p class="sub">지금 내 세계 모양 그대로 올라가요. 올린 뒤에 내 세계를 고쳐도 올린 맵은 그대로예요. (10개까지)</p>
      <button class="btn primary" data-act="bw:publish">올리기</button><button class="btn ghost" data-act="blocks">취소</button>`);
    setTimeout(() => $('mapTitle').focus(), 50);
  }
  async function publish() {
    const title = $('mapTitle').value.trim(), kind = $('mapKind').value;
    const m = Maps.myWorld(S.world);
    if (!title) return publishForm();
    if (S.verified !== Maps.fingerprint(m.data)) return modal('<h2>먼저 깨 보세요</h2><p>모험 모드로 도착까지 깬 다음에 올릴 수 있어요.</p><button class="btn" data-act="blocks">확인</button>');
    try {
      await API.publishMap({ title, kind, size: Maps.MY, data: S.world });
      modal(`<div class="big">🎉</div><h2>‘${esc(title)}’을(를) 올렸어요!</h2><p>누가 처음 깰 때마다 ${won(10)}이 쌓여요. 모두의 맵에서 받을 수 있어요.</p><button class="btn primary" data-act="blocks">확인</button>`);
    } catch (e) {
      modal(`<h2>올리지 못했어요</h2><p>${esc(e.message)}</p><button class="btn" data-act="blocks">확인</button>`);
    }
  }

  // ----- 🌍 모두의 맵 -----
  async function loadShared() {
    const box = $('bwShared');
    try {
      const [list, earned] = await Promise.all([API.listMaps(), API.myMapEarnings()]);
      const me = API.myId();
      box.innerHTML = (earned > 0 ? `<button class="btn primary small" data-collect>💎 내 맵 수익 ${won(earned)} 받기</button>` : '') +
        (list.length ? list.map((m) => `<div class="map-row">
          <span class="mk">${KIND[m.kind] || ''}</span>
          <div class="mt"><b>${esc(m.title)}</b><small>만든 사람 ${esc(m.nickname)} · 깬 사람 ${m.clears}명${m.best_ms ? ` · 최고 ${fmt(m.best_ms)}` : ''}</small></div>
          <button class="btn primary small" data-play="${m.id}">▶ 하기</button>
          ${m.owner === me ? `<button class="btn ghost small" data-del="${m.id}" title="지우기">🗑</button>` : ''}
        </div>`).join('') : '<p>아직 올라온 맵이 없어요. 첫 맵을 만들어 보세요!</p>');
    } catch (e) {
      box.textContent = '맵을 불러오지 못했어요: ' + e.message;
    }
  }
  async function playShared(id) {
    let m;
    try { m = await API.getMap(id); } catch (e) { return alert('맵을 불러오지 못했어요: ' + e.message); }
    const size = m.size.split(',').map(Number), data = Maps.unpack(m.data);
    const spawn = Maps.startOf(size, data);
    if (!spawn) return alert('이 맵에는 출발 블록이 없어요.');
    lastCourse = ['u', id];
    World3D.open({
      size, data, spawn, yaw: 0, sky: '#9fd4ff', timer: true,
      title: `🌍 ${m.title}`, mode: 'adventure', canSwitch: false, inv: S.inv,
      onGoal: (ms) => sharedGoal(id, m.title, ms),
      onExit: render,
    });
  }
  async function sharedGoal(id, title, ms) {
    let r = { first: false, reward: 0 }, rank = [];
    try { r = await API.clearMap(id, ms); rank = await API.mapRanking(id); } catch (e) { console.warn(e); }
    S.money += r.reward;
    save();
    World3D.close(false);
    modal(`<div class="big">🏁</div><h2>‘${esc(title)}’ 도착!</h2><p>⏱ ${fmt(ms)}</p>
      ${r.reward ? `<p class="gain">${ICON.gem} +${won(r.reward)} (처음 깸!)</p>` : `<p class="sub">${r.first ? '내가 만든 맵이라 보상은 없어요.' : '이미 깬 맵이라 보상은 없어요. 기록만 남아요.'}</p>`}
      ${rank.length ? `<p class="sub">🏅 ${rank.map((x, i) => `${i + 1}. ${esc(x.nickname)} ${fmt(x.ms)}`).join(' · ')}</p>` : ''}
      <button class="btn primary" data-act="bw:again">다시 하기</button><button class="btn ghost" data-act="blocks">블록 세상</button>`);
  }

  // ----- 기본 파쿠르·미로 -----
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
    modal(`<div class="big">🏁</div><h2>${kind === 'p' ? '파쿠르' : '미로'} ${lv} 도착!</h2>
      <p>⏱ ${fmt(ms)}${best ? ' · 🏅 최고 기록!' : ''}</p>
      <p class="gain">${ICON.gem} +${won(reward)}</p>
      ${got.length ? `<p class="sub">받은 블록: ${got.map((b) => Blocks.icon(b)).join(' ')}</p>` : ''}
      <button class="btn primary" data-act="bw:again">다시 하기</button>
      <button class="btn ghost" data-act="blocks">블록 세상</button>`);
  }

  function modal(html) {
    $('modal').innerHTML = html;
    $('overlay').classList.remove('hidden');
  }
  // 결과 창 버튼 (game.js의 결과 창 처리에서 'bw:…'를 여기로 보낸다)
  function act(name) {
    if (name === 'again' && lastCourse) return lastCourse[0] === 'u' ? playShared(lastCourse[1]) : openCourse(...lastCourse);
    if (name === 'publishForm') return publishForm();
    if (name === 'publish') return publish();
    render();
  }

  $('bwBack').onclick = renderHome;
  $('bwList').onclick = async (e) => {
    const t = (sel) => e.target.closest(sel);
    if (t('[data-mine]')) return openMine(t('[data-mine]').dataset.mine);
    if (t('[data-bw]')) return act(t('[data-bw]').dataset.bw);
    if (t('[data-play]')) return playShared(+t('[data-play]').dataset.play);
    if (t('[data-del]')) {
      if (!confirm('이 맵을 지울까요? 깬 기록도 같이 지워져요.')) return;
      try { await API.deleteMap(+t('[data-del]').dataset.del); } catch (err) { alert(err.message); }
      return loadShared();
    }
    if (t('[data-collect]')) {
      try { const v = await API.collectMapEarnings(); S.money += v; save(); renderTop(); } catch (err) { alert(err.message); }
      return loadShared();
    }
    const c = t('[data-course]');
    if (c && !c.disabled) openCourse(c.dataset.course, +c.dataset.lv);
  };
  $('blocksBtn').onclick = render;

  return { render, act };
})();

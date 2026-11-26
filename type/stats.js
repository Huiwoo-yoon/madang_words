// ===== 순위표와 성장 그래프 =====
const Stats = (() => {
  const fmtTime = ms => {
    const m = Math.round(ms / 60000);
    return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`;
  };

  // ----- 순위 -----
  let sortKey = 'blocks', rows = [];
  async function rank() {
    $('rankTable').innerHTML = '<tr><td>불러오는 중...</td></tr>';
    try { rows = await API.leaderboard(); } catch (e) {
      $('rankTable').innerHTML = `<tr><td>순위를 불러오지 못했어요 (${esc(e.message || e)})</td></tr>`;
      return;
    }
    drawRank();
  }
  function drawRank() {
    document.querySelectorAll('#rankSort button').forEach(b => b.classList.toggle('on', b.dataset.sort === sortKey));
    const list = rows.filter(r => r.blocks > 0 || r.id === ME.id)
      .sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0) || b.blocks - a.blocks);
    const medal = i => ['🥇', '🥈', '🥉'][i] || i + 1;
    const th = (key, label) => `<th class="${key === sortKey ? 'on' : ''}">${label}</th>`;
    $('rankTable').innerHTML =
      `<tr><th>순위</th><th>플레이어</th><th>레벨</th>${th('blocks', '점수')}${th('best_ko', '한글 속도')}${th('best_en', '영어 속도')}<th>정확도</th>${th('play_ms', '플레이 시간')}</tr>` +
      list.map((r, i) => {
        const acc = r.keys + r.errors ? Math.round(100 * r.keys / (r.keys + r.errors)) + '%' : '-';
        return `<tr class="${r.id === ME.id ? 'me' : ''}"><td>${medal(i)}</td>` +
          `<td><img src="${CHARS[r.character]?.faceUrl || ''}" alt="">${esc(r.nickname)}</td>` +
          `<td>${Math.floor(r.blocks / 10) + 1}</td><td>${r.blocks}</td><td>${r.best_ko || '-'}</td><td>${r.best_en || '-'}</td>` +
          `<td>${acc}</td><td>${fmtTime(r.play_ms)}</td></tr>`;
      }).join('');
  }
  document.querySelectorAll('#rankSort button').forEach(b => b.onclick = () => { sortKey = b.dataset.sort; drawRank(); });

  // ----- 성장 -----
  let days = 7, sessions = [];
  async function growth() {
    $('cards').innerHTML = '불러오는 중...';
    try { sessions = await API.mySessions(); } catch (e) {
      $('cards').textContent = `기록을 불러오지 못했어요 (${e.message || e})`;
      return;
    }
    drawGrowth();
  }
  const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  function drawGrowth() {
    document.querySelectorAll('#rangeSeg button').forEach(b => b.classList.toggle('on', +b.dataset.days === days));
    // 날짜별로 합치기
    const byDay = {};
    sessions.forEach(s => {
      const k = dayKey(new Date(s.created_at));
      const d = byDay[k] || (byDay[k] = { ko: [0, 0], en: [0, 0], keys: 0, errors: 0, blocks: 0, play: 0 });
      if (s.lang === 'ko' || s.lang === 'en') { d[s.lang][0] += s.keys; d[s.lang][1] += s.active_ms; }
      d.keys += s.keys; d.errors += s.errors; d.blocks += s.blocks; d.play += s.play_ms;
    });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let start = new Date(today);
    if (days) start.setDate(start.getDate() - days + 1);
    else {
      const first = Object.keys(byDay).sort()[0];
      if (first) start = new Date(first + 'T00:00:00');
    }
    const keys = [];
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) keys.push(dayKey(d));
    const labels = keys.map(k => `${+k.slice(5, 7)}/${+k.slice(8)}`);
    const get = f => keys.map(k => byDay[k] ? f(byDay[k]) : null);
    const speed = lang => get(d => d[lang][0] >= 20 && d[lang][1] ? Math.round(d[lang][0] * 60000 / d[lang][1]) : null);

    const total = sessions.reduce((a, s) => a + s.play_ms, 0);
    const best = lang => Math.max(0, ...sessions.filter(s => s.lang === lang && s.keys >= 60 && s.active_ms).map(s => Math.round(s.keys * 60000 / s.active_ms))) || '-';
    $('cards').innerHTML = [
      ['점수 (캔 블록)', D.blocks], ['총 플레이 시간', fmtTime(total)],
      ['🏅 한글 최고 속도', best('ko')], ['🏅 영어 최고 속도', best('en')],
    ].map(([t, v]) => `<div><span>${t}</span><b>${v}</b></div>`).join('');

    chart('chSpeed', labels, [{ name: '한글', color: '#ffe066', values: speed('ko') }, { name: '영어', color: '#5decf5', values: speed('en') }], 'line');
    chart('chAcc', labels, [{ name: '정확도', color: '#ff9a3c', values: get(d => d.keys + d.errors ? Math.round(100 * d.keys / (d.keys + d.errors)) : null) }], 'line', 100);
    chart('chBlocks', labels, [{ name: '블록', color: '#7CFC00', values: get(d => d.blocks) }], 'bar');
    chart('chTime', labels, [{ name: '분', color: '#c77dff', values: get(d => Math.round(d.play / 60000)) }], 'bar');
  }
  document.querySelectorAll('#rangeSeg button').forEach(b => b.onclick = () => { days = +b.dataset.days; drawGrowth(); });

  // 간단한 SVG 선/막대 그래프
  function chart(id, labels, series, type, fixedMax) {
    const el = $(id);
    const all = series.flatMap(s => s.values).filter(v => v != null);
    if (!all.length || all.every(v => v === 0)) { el.innerHTML = '<div class="empty">아직 기록이 없어요. 타자를 쳐 보세요!</div>'; return; }
    const W = 720, H = 200, L = 40, R = 12, T = 12, B = 26;
    const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find(s => s * 4 >= Math.max(...all)) || 1000;
    const max = fixedMax || step * 4;
    const n = labels.length, bw = (W - L - R) / n;
    const X = i => L + bw * (i + .5), Y = v => T + (H - T - B) * (1 - v / max);
    let svg = '';
    for (let k = 0; k <= 4; k++) { // 가로 눈금
      const v = max * k / 4, y = Y(v);
      svg += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,.15)"/><text x="${L - 6}" y="${y + 4}" fill="#aaa" font-size="11" text-anchor="end">${Math.round(v)}</text>`;
    }
    const every = Math.ceil(n / 10); // 날짜 글씨는 최대 10개 정도만
    labels.forEach((lb, i) => { if (i % every === 0 || i === n - 1) svg += `<text x="${X(i)}" y="${H - 8}" fill="#aaa" font-size="11" text-anchor="middle">${lb}</text>`; });
    series.forEach((s, si) => {
      if (type === 'bar') {
        const w = Math.max(2, bw * .7 / series.length);
        s.values.forEach((v, i) => { if (v) svg += `<rect x="${X(i) - bw * .35 + si * w}" y="${Y(v)}" width="${w}" height="${Y(0) - Y(v)}" fill="${s.color}"><title>${labels[i]}: ${v}</title></rect>`; });
      } else {
        const pts = s.values.map((v, i) => v == null ? null : [X(i), Y(Math.min(v, max))]).filter(Boolean);
        if (pts.length > 1) svg += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${s.color}" stroke-width="3"/>`;
        s.values.forEach((v, i) => { if (v != null) svg += `<circle cx="${X(i)}" cy="${Y(Math.min(v, max))}" r="4" fill="${s.color}"><title>${labels[i]}: ${v}</title></circle>`; });
      }
    });
    const legend = series.length > 1 ? `<div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${s.name}</span>`).join('')}</div>` : '';
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img">${svg}</svg>${legend}`;
  }

  return { rank, growth };
})();

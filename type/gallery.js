// ===== 구경하기: 다른 사람의 건축물 보기 (보기만 가능) =====
const Gallery = (() => {
  let list = [], cur = null, biome = null;
  const count = w => (w || []).filter(Boolean).length;

  async function open() {
    $('galleryView').hidden = true;
    $('galleryList').innerHTML = '불러오는 중...';
    let rows;
    try { rows = await API.worlds(); } catch (e) {
      $('galleryList').textContent = `작품을 불러오지 못했어요 (${e.message || e})`;
      return;
    }
    list = rows.map(p => {
      const worlds = p.id === ME.id ? D.worlds : (p.worlds || {}); // 내 것은 저장 전 것까지 최신으로
      return { ...p, worlds, total: Object.values(worlds).reduce((a, w) => a + count(w), 0) };
    }).filter(p => p.total > 0);
    if (!list.length) {
      $('galleryList').innerHTML = '<p class="note">아직 지은 작품이 없어요. 🏗️ 만들기에서 첫 작품을 지어 보세요!</p>';
      return;
    }
    $('galleryList').innerHTML = list.map(p =>
      `<button class="char" data-id="${esc(p.id)}"><img src="${CHARS[p.character]?.faceUrl || ''}" alt="">` +
      `<span class="nm">${esc(p.nickname)}${p.id === ME.id ? ' (나)' : ''}</span><span>블록 ${p.total}개</span></button>`).join('');
    show(list[0].id);
  }

  function show(id) {
    cur = list.find(p => p.id === id);
    const biomes = Object.keys(BIOMES).filter(b => count(cur.worlds[b]) > 0);
    biome = biomes[0];
    document.querySelectorAll('#galleryList .char').forEach(b => b.classList.toggle('cur', b.dataset.id === id));
    $('galleryBiomes').innerHTML = biomes.map(b => `<button data-biome="${b}">${BIOMES[b].name}</button>`).join('');
    $('galleryView').hidden = false;
    draw();
  }

  function draw() {
    document.querySelectorAll('#galleryBiomes button').forEach(b => b.classList.toggle('on', b.dataset.biome === biome));
    $('galleryTitle').textContent = `${cur.nickname}의 ${BIOMES[biome].name} (블록 ${count(cur.worlds[biome])}개)`;
    Build.render($('galleryCanvas'), cur.worlds[biome], biome);
  }

  $('galleryList').onclick = e => { const b = e.target.closest('.char'); if (b) show(b.dataset.id); };
  $('galleryBiomes').onclick = e => { const b = e.target.closest('button'); if (b) { biome = b.dataset.biome; draw(); } };

  return { open };
})();

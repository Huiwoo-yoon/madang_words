// ===== 🛠️ 작업대: 작업대를 한 번 만들면 도구(곡괭이)와 가구·장식을 만들 수 있다 =====
// D.crafting  = 작업대를 만들었는지 (한 번 만들면 계속)
// D.tools.pickaxe = 쓰고 있는 곡괭이 단계 (0 나무 · 1 돌 · 2 철 · 3 다이아). 높을수록 보너스 블록이 더 자주 나온다.
const Craft = (() => {
  const TOOLS = [ // PICKAXES[tier]는 art.js. 0단계는 처음부터 가지고 있다
    { tier: 1, cost: { cobble: 3, log: 2 } },
    { tier: 2, cost: { iron: 3, log: 2 } },
    { tier: 3, cost: { diamond: 3, log: 2 } },
  ];
  const ITEMS = [ // out: 한 번에 몇 개 만들어지는지. 모양은 art.js의 같은 id 블록
    { id: 'crafting_table', out: 1, cost: { planks: 4 }, hand: true }, // 맨손으로도 만들 수 있는 유일한 것
    { id: 'torch', out: 4, cost: { coal: 1, log: 1 } },
    { id: 'door', out: 1, cost: { planks: 4 } },
    { id: 'bed', out: 1, cost: { planks: 3, leaves: 3 } },
    { id: 'chest', out: 1, cost: { planks: 4, log: 4 } },
    { id: 'fence', out: 3, cost: { log: 2, planks: 1 } },
    { id: 'furnace', out: 1, cost: { cobble: 6 } },
  ];

  // 💎 에메랄드 가게: 값은 끝말잇기 상점과 같다 (lvl 0 = 가구·장식)
  const GEM_PRICE = { 1: 20, 2: 40, 3: 80, 4: 200, 0: 150 };
  const GEM_PICK = [0, 500, 1500, 4000]; // 곡괭이 단계별 값
  const gems = () => ME.points || 0;

  const lacks = cost => Object.entries(cost).filter(([id, n]) => (D.inv[id] || 0) < n);
  const costHTML = cost => Object.entries(cost).map(([id, n]) => {
    const have = D.inv[id] || 0;
    return `<span class="${have < n ? 'lack' : ''}" title="${BLOCK[id].name}"><img src="${BLOCK[id].url}" alt="">${have}/${n}</span>`;
  }).join('');
  const tier = () => (D.tools && D.tools.pickaxe) || 0;

  function draw() {
    $('craftStatus').innerHTML = D.crafting
      ? '✅ 작업대가 있어요! 도구와 가구를 마음껏 만들 수 있어요.'
      : '🛠️ 먼저 <b>작업대</b>를 만들어요 (나무판자 4개). 작업대가 있어야 다른 것을 만들 수 있어요.';

    $('craftTools').innerHTML = [{ tier: 0 }, ...TOOLS].map(t => {
      const P = PICKAXES[t.tier], chance = Math.round(100 * bonusChanceAt(t.tier));
      const own = t.tier <= tier(), using = t.tier === tier();
      const state = using ? '🖐️ 쓰는 중' : own ? '✓ 가지고 있어요' : !D.crafting ? '작업대가 필요해요' : lacks(t.cost).length ? '재료 모으는 중' : '✅ 만들 수 있어요!';
      const cls = using ? 'sel' : own ? '' : D.crafting && !lacks(t.cost).length ? 'ready' : 'locked';
      return `<button class="recipe ${cls}" data-tool="${t.tier}"><img class="ico" src="${P.url}" alt=""><span class="nm">${P.name}</span>` +
        `<span class="cost">${t.cost ? costHTML(t.cost) : '처음부터 있어요'}</span><span>🎁 보너스 확률 ${chance}%</span><span>${state}</span></button>`;
    }).join('');

    const next = tier() + 1;
    $('gemPick').innerHTML = next < PICKAXES.length
      ? `<button class="buy" id="gemPickBtn" ${gems() < GEM_PICK[next] ? 'disabled' : ''}><img src="${PICKAXES[next].url}" alt=""> 💎 ${GEM_PICK[next].toLocaleString('ko-KR')}으로 ${PICKAXES[next].name} 바로 받기</button>`
      : '<p class="note">⛏️ 가장 좋은 곡괭이를 쓰고 있어요!</p>';
    $('gemShop').innerHTML = BLOCKS.map(B => {
      const p = GEM_PRICE[B.lvl];
      return `<div class="recipe gem"><img class="ico" src="${B.url}" alt=""><span class="nm">${B.name}</span><span>내 것 ${D.inv[B.id] || 0}개 · 💎 ${p}</span>` +
        `<span class="gemBtns"><button data-gem="${B.id}" data-n="1" ${gems() < p ? 'disabled' : ''}>1개</button><button data-gem="${B.id}" data-n="10" ${gems() < p * 10 ? 'disabled' : ''}>10개</button></span></div>`;
    }).join('');

    $('craftItems').innerHTML = ITEMS.map(it => {
      const B = BLOCK[it.id], usable = D.crafting || it.hand, lack = lacks(it.cost);
      const cls = !usable || lack.length ? 'locked' : 'ready';
      const state = !usable ? '작업대가 필요해요' : lack.length ? '재료 모으는 중' : '✅ 만들 수 있어요!';
      return `<button class="recipe ${cls}" data-item="${it.id}"><img class="ico" src="${B.url}" alt=""><span class="nm">${B.name}${it.out > 1 ? ` ×${it.out}` : ''}</span>` +
        `<span class="cost">${costHTML(it.cost)}</span><span>내 것 ${D.inv[it.id] || 0}개</span><span>${state}</span></button>`;
    }).join('');
  }

  function pay(cost) { Object.entries(cost).forEach(([id, n]) => { D.inv[id] -= n; }); }
  function done(title, sub) {
    sfx.build(); confetti();
    popup(title, sub);
    saveNow();
    draw();
  }
  function hint(msg) { popup('🛠️ 아직이에요', msg); }

  function craftTool(t) {
    const tool = TOOLS.find(x => x.tier === t);
    if (t <= tier()) return;
    if (!D.crafting) return hint('먼저 작업대를 만들어요!');
    const lack = lacks(tool.cost);
    if (lack.length) return hint(`재료가 모자라요: ${lack.map(([id, n]) => `${BLOCK[id].name} ${n - (D.inv[id] || 0)}개`).join(', ')}`);
    pay(tool.cost);
    D.tools = { ...D.tools, pickaxe: t };
    setMiner(ME.character); // 캐는 캐릭터가 든 곡괭이 모양이 바뀜
    done(`⛏️ ${PICKAXES[t].name} 완성!`, `보너스 블록이 ${Math.round(100 * bonusChanceAt(t))}%로 더 자주 나와요`);
  }

  function craftItem(id) {
    const it = ITEMS.find(x => x.id === id);
    if (!D.crafting && !it.hand) return hint('먼저 작업대를 만들어요!');
    const lack = lacks(it.cost);
    if (lack.length) return hint(`재료가 모자라요: ${lack.map(([b, n]) => `${BLOCK[b].name} ${n - (D.inv[b] || 0)}개`).join(', ')}`);
    pay(it.cost);
    D.inv[id] = (D.inv[id] || 0) + it.out;
    if (id === 'crafting_table' && !D.crafting) {
      D.crafting = true;
      return done('🛠️ 작업대 완성!', '이제 도구와 가구를 만들 수 있어요');
    }
    done(`${BLOCK[id].name} ${it.out}개 완성!`, '🏗️ 만들기에서 놓을 수 있어요');
  }

  function gemBuy(id, n) {
    const cost = GEM_PRICE[BLOCK[id].lvl] * n;
    if (gems() < cost) return hint(`에메랄드가 ${cost - gems()}개 모자라요.`);
    ME.points -= cost;
    D.inv[id] = (D.inv[id] || 0) + n;
    drawInventory(id);
    updateStats();
    done(`💎 ${BLOCK[id].name} ${n}개를 샀어요!`, '블록 가방에 들어갔어요');
  }
  function gemPick() {
    const t = tier() + 1, cost = GEM_PICK[t];
    if (t >= PICKAXES.length || gems() < cost) return;
    ME.points -= cost;
    D.tools = { ...D.tools, pickaxe: t };
    setMiner(ME.character);
    updateStats();
    done(`⛏️ ${PICKAXES[t].name}!`, `보너스 블록이 ${Math.round(100 * bonusChanceAt(t))}%로 더 자주 나와요`);
  }
  $('gemShop').onclick = e => { const b = e.target.closest('[data-gem]'); if (b && !b.disabled) gemBuy(b.dataset.gem, +b.dataset.n); };
  $('gemPick').onclick = e => { if (e.target.closest('#gemPickBtn:not([disabled])')) gemPick(); };
  $('craftTools').onclick = e => { const b = e.target.closest('[data-tool]'); if (b) craftTool(+b.dataset.tool); };
  $('craftItems').onclick = e => { const b = e.target.closest('[data-item]'); if (b) craftItem(b.dataset.item); };

  return { open: draw };
})();

// 구조물 레시피. shape는 위에서 아래로 그린 모양이고, 맨 아랫줄이 클릭한 칸에 놓인다.
// 글자는 key의 블록으로 바뀌고, '.'과 ' '은 빈 칸(재료 필요 없음, 비어 있어야 하지도 않음)이다.
const RECIPES = [
  {
    id: 'tree', name: '🌳 나무',
    key: { L: 'leaves', W: 'log' },
    shape: [' LLL ', 'LLLLL', ' LWL ', '  W  ', '  W  '],
  },
  {
    id: 'hut', name: '🛖 흙 오두막',
    key: { G: 'grass', W: 'log', D: 'dirt' },
    shape: [' GGG ', 'GGGGG', 'WDDDW', 'WD.DW'],
  },
  {
    id: 'pyramid', name: '🔺 피라미드',
    key: { S: 'sand' },
    shape: ['  S  ', ' SSS ', 'SSSSS'],
  },
  {
    id: 'tower', name: '🗼 돌 탑',
    key: { C: 'cobble', S: 'stone' },
    shape: ['C.C.C', 'CCCCC', '.CSC.', '.CSC.', '.CSC.'],
  },
  {
    id: 'house', name: '🏠 벽돌 지붕 집',
    key: { R: 'brick', W: 'log', P: 'planks', G: 'glass' },
    shape: ['  R  ', ' RRR ', 'RRRRR', 'WPGPW', 'WP.PW'],
  },
  {
    id: 'castle', name: '🏰 성',
    key: { C: 'cobble', S: 'stone', G: 'glass', I: 'iron' },
    shape: ['C.C.C.C', 'CCCCCCC', 'CSSGSSC', 'CSS.SSC', 'CIS.SIC'],
  },
  {
    id: 'heart', name: '💖 보석 하트',
    key: { G: 'gold', D: 'diamond' },
    shape: ['.G.G.', 'GDGDG', 'GDDDG', '.GDG.', '..G..'],
  },
  {
    id: 'statue', name: '🗿 에메랄드 조각상',
    key: { E: 'emerald', L: 'lapis', S: 'stone' },
    shape: ['.EEE.', '.ELE.', 'EEEEE', '.E.E.', 'SSSSS'],
  },
];
// 필요한 재료 수 { blockId: 개수 }
RECIPES.forEach(r => {
  r.cost = {};
  r.shape.join('').split('').forEach(ch => { const id = r.key[ch]; if (id) r.cost[id] = (r.cost[id] || 0) + 1; });
});

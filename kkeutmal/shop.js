// ===== 상점 물건 (블록 세상) =====
// emoji 칸에는 pixel.js로 그린 도트 그림(<img>)이 들어간다
const ICON = {
  gem: Pix.img('gem', { a: '#0a7a3a', b: '#2ad06a', w: '#c8ffd8' }, 'gem'),
  trophy: Pix.img('trophy', { a: '#c89a1a', b: '#ffd84a' }, 'gem'),
  miner: Pix.img('hero', { h: '#ffcf3f', a: '#e0a878', w: '#ffffff', e: '#3a5ad0', x: '#c08060', m: '#8a4a3a' }),
};
const potion = (liquid) => Pix.img('potion', { b: '#8a5a32', w: '#cfe8ff', a: liquid });

// 🧪 물약: 사서 모아 두고, 게임 중에 쓴다
const POTIONS = [
  { id: 'time', emoji: potion('#ffd23f'), name: '시간 물약', cost: 300, desc: '내 차례에 마시면 시간이 7초 늘어나요.' },
  { id: 'hint', emoji: potion('#40c0ff'), name: '힌트 물약', cost: 500, desc: '이어 쓸 수 있는 단어 하나를 알려 줘요.' },
  { id: 'shield', emoji: potion('#e04060'), name: '보호 물약', cost: 1000, desc: '틀린 단어를 한 번 봐줘요. 갖고 있으면 저절로 써져요.' },
];

// ⚒️ 업그레이드: 한 번 사면 계속, 단계마다 비싸진다 (최대 5단계)
const UPGRADES = [
  { id: 'clock', emoji: Pix.img('clock', { x: '#ffcf3f', a: '#fff6d0', e: '#3a2a1a' }), name: '황금 시계', base: 300, max: 5, desc: (n) => `내 시간 +${n}초` },
  { id: 'wallet', emoji: Pix.img('chest', { a: '#5a3a1a', b: '#a8743a', x: '#ffcf3f' }), name: '보물 상자', base: 400, max: 5, desc: (n) => `이긴 에메랄드 +${n * 10}%` },
  { id: 'brain', emoji: Pix.img('book', { a: '#4a2a1a', b: '#b0302a', x: '#ffcf3f' }), name: '마법책', base: 500, max: 5, desc: (n) => `보스가 단어를 까먹을 확률 +${n * 2}%` },
];
const upgradeCost = (u, n) => u.base * (n + 1) * (n + 1); // n단계 → n+1단계 값

// ⛏️ 광부 알바: 고용하면 1초마다 에메랄드를 캐 온다. 레벨 = 1초에 캐는 양 (최대 10)
const ALBA_MAX = 10;
const albaCost = (n) => 500 * (n + 1) * (n + 1); // 고용 500, 2단계 2,000 …

// 🧑 캐릭터: 하나를 골라 함께 싸운다. 저마다 능력이 있다 (id는 저장 기록 때문에 그대로 둔다)
const hero = (hat, eye = '#3a5ad0') => Pix.img('hero', { h: hat, a: '#e0a878', w: '#ffffff', e: eye, x: '#c08060', m: '#8a4a3a' });
const CHARACTERS = [
  { id: 'me', emoji: hero('#4a2a1a'), name: '초보 모험가', voice: 'yay', cost: 0, desc: '특별한 능력은 없지만 씩씩해요.' },
  { id: 'dog', emoji: Pix.img('animal', { a: '#e8e8e8', b: '#b8b8b8', h: '#c8c8c8', e: '#1a1a1a', x: '#1a1a1a', m: '#d04040' }), name: '늑대 친구', voice: 'bark', cost: 2000, time: 2, desc: '내 시간 +2초' },
  { id: 'hamster', emoji: hero('#ffcf3f'), name: '광부', voice: 'clink', cost: 5000, miss: 0.03, desc: '보스가 단어를 까먹을 확률 +3%' },
  { id: 'unicorn', emoji: hero('#2a8a3a', '#6a4a2a'), name: '보물 상인', voice: 'coin', cost: 10000, reward: 0.3, desc: '이긴 에메랄드 +30%' },
  { id: 'fairy', emoji: Pix.img('wizard', { a: '#e0a878', b: '#e8e8e8', h: '#5a2aa0', x: '#ffcf3f', e: '#1a1a1a', m: '#8a4a3a' }), name: '마법사', voice: 'sparkle', cost: 30000, freeFee: true, desc: '참가비가 언제나 0' },
  { id: 'hero', emoji: hero('#b8b8c8', '#1a1a1a'), name: '철갑 기사', voice: 'clang', cost: 60000, time: 3, reward: 0.2, desc: '내 시간 +3초, 이긴 에메랄드 +20%' },
  { id: 'tiger', emoji: Pix.img('dragon', { a: '#c02a2a', b: '#ff6a3a', h: '#6a0a0a', e: '#ffd23f', x: '#ffffff' }), name: '용 기사', voice: 'roar', cost: 150000, time: 3, reward: 0.5, miss: 0.05, desc: '내 시간 +3초, 이긴 에메랄드 +50%, 보스 실수 +5%' },
];

// 🎨 배경(바이옴): 5레벨마다 바뀐다. 그림은 pixel.js가 블록으로 그린다
const BACKGROUNDS = ['풀밭 평원', '깊은 동굴', '바닷가', '사막', '용암 지하', '별빛 섬'].map((name, i) => ({ name, i }));
const bgFor = (lv) => BACKGROUNDS[Math.floor((lv - 1) / 5)];

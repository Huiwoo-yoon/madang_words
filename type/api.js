// ===== 타자연습 → 블록 마당 통합 계정 연결 =====
// 타자연습 코드는 예전 API 모양 { id, username, nickname, character, data }를 그대로 쓴다.
// 여기서 통합 계정(../api.js)으로 바꿔 준다:
//   타자연습 data → 통합 profile.data.type,  data.inv(블록 가방) → 통합 profile.data.inv (끝말잇기와 같이 씀)
//   타자연습 캐릭터 → profile.data.type.character (마당 캐릭터와 따로)
//   points(💎 에메랄드 지갑)는 모든 놀이 공용
API = ((base) => {
  let P = null; // 통합 프로필 원본
  let known = 0; // 마지막으로 맞춘 에메랄드 (놀이터에서 딱지치기·투호가 같이 바꿀 수 있어서, 바뀐 만큼만 더한다)
  function toType(p) {
    P = p;
    P.data = P.data || {};
    known = p.points;
    const { character, ...t } = P.data.type || {};
    return { id: p.id, username: p.username, nickname: p.nickname, points: p.points, character: character || 'steve', data: { ...t, inv: P.data.inv || {} } };
  }
  return {
    online: base.online,
    async restore() { const p = await base.restore(); return p ? toType(p) : null; },
    async signIn(username, password) { return toType(await base.signIn(username, password)); },
    async signUp(username, password, nickname, character, data) {
      const t = toType(await base.signUp(username, password, nickname));
      t.character = character;
      t.data = { ...data, inv: t.data.inv };
      await this.saveProfile(t);
      return t;
    },
    async signOut() { P = null; await base.signOut(); },
    async saveProfile(t) {
      const { inv, ...rest } = t.data;
      P.nickname = t.nickname;
      const fresh = await base.restore(); // 지금 저장된 에메랄드에 타자연습에서 바뀐 만큼만 더한다
      P.points = Math.max(0, (fresh ? fresh.points : known) + (t.points - known));
      known = t.points = P.points;
      P.data.inv = inv;
      P.data.type = { ...rest, character: t.character };
      await base.saveProfile(P);
    },
    addSession: (rec) => base.addSession(rec),
    mySessions: () => base.mySessions(),
    leaderboard: () => base.typeLeaderboard(),
    worlds: () => base.worlds(),
  };
})(API);

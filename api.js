// ===== 블록 마당: 계정·지갑·저장 (모든 놀이가 같이 쓴다) =====
// CONFIG에 Supabase 정보가 있으면 온라인 DB(bm_ 표), 없으면 이 브라우저(localStorage)에 저장한다.
// profile = { id, username, nickname, points, character, chars, data }
//   points = 에메랄드(지갑, 모든 놀이 공용)
//   data   = { inv: {블록: 개수} ← 공용 블록 가방, type: 타자연습 저장, kk: 끝말잇기 저장 }
// 마당 놀이(딱지치기·투호·미니게임)는 예전과 같은 함수(restore, loadGame, save, leaderboard)를 그대로 쓴다.
// 타자연습(type/api.js)은 이 API를 감싸서 쓴다. 그래서 const가 아니라 var로 둔다.
var API = (() => {
  const online = !!(window.CONFIG && CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && window.supabase);
  const ID_RE = /^[a-z0-9_]{3,16}$/;
  function check(username, password, nickname) {
    if (!ID_RE.test(username)) throw new Error('아이디는 영어 소문자·숫자·_ 로 3~16자예요.');
    if (password.length < 6) throw new Error('비밀번호는 6자 이상이에요.');
    if (nickname !== undefined && !(nickname.length >= 1 && nickname.length <= 10)) throw new Error('닉네임은 1~10자예요.');
  }
  const addInv = (a = {}, b = {}) => { const r = { ...a }; for (const [k, n] of Object.entries(b)) r[k] = (r[k] || 0) + (n || 0); return r; };

  // 타자 순위 한 줄 (이 컴퓨터 전용 모드에서 계산. 온라인은 DB의 bm_type_leaderboard 뷰가 같은 계산을 한다)
  function aggregate(u, sessions) {
    const row = { id: u.id, nickname: u.nickname, character: (u.data.type || {}).character || 'steve', blocks: 0, play_ms: 0, keys: 0, errors: 0, best_ko: null, best_en: null };
    sessions.forEach((s) => {
      row.blocks += s.blocks; row.play_ms += s.play_ms; row.keys += s.keys; row.errors += s.errors;
      if ((s.lang === 'ko' || s.lang === 'en') && s.keys >= 60 && s.active_ms > 0) {
        const k = 'best_' + s.lang;
        row[k] = Math.max(row[k] || 0, Math.round((s.keys * 60000) / s.active_ms));
      }
    });
    return row;
  }

  if (online) {
    const sb = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
    const email = (u) => `${u}@blockmadang.game`; // 아이디를 로그인용 이메일 모양으로 (메일은 보내지 않음)
    const COLS = 'id, username, nickname, points, character, chars, data';
    let uid = null;
    async function loadProfile() {
      const { data, error } = await sb.from('bm_profiles').select(COLS).eq('id', uid).maybeSingle();
      if (error) throw error;
      return data;
    }
    const must = ({ error }) => { if (error) throw error; };

    return {
      online,
      async restore() {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return null;
        uid = session.user.id;
        return loadProfile();
      },
      async signUp(username, password, nickname) {
        check(username, password, nickname);
        const { data: res, error } = await sb.auth.signUp({ email: email(username), password });
        if (error) throw new Error(/registered|exists/i.test(error.message) ? '이미 있는 아이디예요. 다른 아이디를 골라요.' : error.message);
        if (!res.session) throw new Error('Supabase에서 "Confirm email"을 꺼야 해요 (README 참고).');
        uid = res.user.id;
        const { data: row, error: e2 } = await sb.from('bm_profiles').insert({ id: uid, username, nickname }).select(COLS).single();
        if (e2) throw e2;
        return row;
      },
      async signIn(username, password) {
        const { data: res, error } = await sb.auth.signInWithPassword({ email: email(username), password });
        if (error) throw new Error('아이디나 비밀번호가 틀렸어요.');
        uid = res.user.id;
        const p = await loadProfile();
        if (!p) throw new Error('이 아이디의 저장 데이터가 없어요.');
        return p;
      },
      async signOut() { uid = null; await sb.auth.signOut(); },
      // 지갑·캐릭터·data를 한꺼번에 저장 (타자연습·끝말잇기가 쓴다)
      async saveProfile(p) {
        if (p.id !== uid) throw new Error('다른 아이디로 바뀌었어요. 새로고침해 주세요.'); // 다른 창에서 아이디를 바꾼 경우
        must(await sb.from('bm_profiles').update({ nickname: p.nickname, points: p.points, character: p.character, chars: p.chars, data: p.data }).eq('id', uid));
      },
      async loadGame(game) {
        const { data, error } = await sb.from('bm_saves').select('trophies, level, data').eq('user_id', uid).eq('game', game).maybeSingle();
        if (error) throw error;
        if (data) return data;
        const { data: row, error: e2 } = await sb.from('bm_saves').insert({ user_id: uid, game }).select('trophies, level, data').single();
        if (e2) throw e2;
        return row;
      },
      // 마당 놀이 저장: 지갑·캐릭터 + 그 놀이 저장. 서버가 트로피·레벨을 고칠 수 있어서 저장된 값을 돌려준다
      async save(game, s) {
        const [prof, row] = await Promise.all([
          sb.from('bm_profiles').update({ points: s.points, character: s.character, chars: s.chars }).eq('id', uid),
          sb.from('bm_saves').update({ trophies: s.trophies, level: s.level, data: s.data }).eq('user_id', uid).eq('game', game).select('trophies, level').single(),
        ]);
        must(prof); must(row);
        return row.data;
      },
      async leaderboard(game) {
        let q = sb.from('bm_leaderboard').select('id, nickname, character, game, trophies, level');
        if (game) q = q.eq('game', game).order('trophies', { ascending: false }).order('level', { ascending: false }).limit(100);
        const { data, error } = await q;
        if (error) throw error;
        return data;
      },
      // ----- 타자연습용 -----
      async addSession(rec) { must(await sb.from('bm_sessions').insert({ ...rec, user_id: uid })); },
      async mySessions() {
        const { data, error } = await sb.from('bm_sessions').select('created_at, lang, keys, errors, active_ms, play_ms, blocks, words').eq('user_id', uid).order('created_at');
        if (error) throw error;
        return data;
      },
      async typeLeaderboard() {
        const { data, error } = await sb.from('bm_type_leaderboard').select('*');
        if (error) throw error;
        return data;
      },
      async worlds() {
        const { data, error } = await sb.from('bm_public_worlds').select('id, nickname, character, worlds, updated_at').order('updated_at', { ascending: false }).limit(200);
        if (error) throw error;
        return data;
      },
      // ----- 🌍 모두의 맵 (3D 블록 세상에서 만든 파쿠르·미로) — maps.sql -----
      async listMaps() {
        const { data, error } = await sb.from('bm_map_list').select('*').order('created_at', { ascending: false }).limit(100);
        if (error) throw new Error(/bm_map_list/.test(error.message) ? '관리자가 Supabase에서 maps.sql을 실행해야 해요.' : error.message);
        return data;
      },
      async getMap(id) {
        const { data, error } = await sb.from('bm_maps').select('id, title, kind, size, data').eq('id', id).single();
        if (error) throw error;
        return data;
      },
      async publishMap(m) {
        const { data, error } = await sb.from('bm_maps').insert({ owner: uid, title: m.title, kind: m.kind, size: m.size.join(','), data: m.data }).select('id').single();
        if (error) throw new Error(error.message);
        return data.id;
      },
      async deleteMap(id) { must(await sb.from('bm_maps').delete().eq('id', id).eq('owner', uid)); },
      async clearMap(id, ms) { // → { first, reward }
        const { data, error } = await sb.rpc('bm_clear_map', { p_map: id, p_ms: Math.round(ms) });
        if (error) throw error;
        return data;
      },
      async mapRanking(id) {
        const { data, error } = await sb.from('bm_map_ranking').select('nickname, ms').eq('map_id', id).order('ms').limit(5);
        if (error) throw error;
        return data;
      },
      async myMapEarnings() {
        const { data } = await sb.from('bm_maps').select('earned').eq('owner', uid);
        return (data || []).reduce((a, r) => a + r.earned, 0);
      },
      async collectMapEarnings() {
        const { data, error } = await sb.rpc('bm_collect_map_earnings');
        if (error) throw error;
        return data || 0;
      },
      // ----- 끝말잇기 국어사전 확인: Supabase 함수 dict-check (찾은 결과는 bm_dict 표에 쌓인다) -----
      async dictCheck(word) {
        try {
          const r = await fetch(`${CONFIG.supabaseUrl}/functions/v1/dict-check?w=${encodeURIComponent(word)}`, { headers: { apikey: CONFIG.supabaseAnonKey } });
          if (!r.ok) throw new Error(r.status);
          return await r.json();
        } catch { return { ok: false, error: '국어사전에 연결하지 못했어요. 잠시 뒤에 다시 써 보세요.' }; }
      },
      async dictLearned() { // 국어사전에서 확인된 단어 (보스들도 배워서 쓴다)
        const { data } = await sb.from('bm_dict').select('word').eq('ok', true).limit(10000);
        return (data || []).map((r) => r.word);
      },
      // ----- 예전 계정 가져오기: kind = 'type'(타자연습) | 'madang'(전통놀이 마당) -----
      // 예전 계정으로 잠깐 따로 로그인해서 읽기만 한다 (예전 기록은 바꾸지 않는다)
      async importOld(kind, username, password) {
        const old = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey,
          { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'bm-import' } });
        const { data: res, error } = await old.auth.signInWithPassword({ email: `${username}@${kind === 'type' ? 'typemine' : 'madang'}.game`, password });
        if (error) throw new Error('예전 아이디나 비밀번호가 틀렸어요.');
        const oldId = res.user.id;
        try {
          // 같은 예전 계정은 한 번만 (두 번 가져와서 블록·에메랄드를 불리지 못하게)
          const { error: e1 } = await sb.from('bm_imports').insert({ source: `${kind}:${oldId}`, user_id: uid });
          if (e1) throw new Error(e1.code === '23505' ? '이 예전 계정은 이미 가져왔어요.' : e1.message);
          const me = await loadProfile();
          me.data = me.data || {};
          const got = { points: 0, blocks: 0, games: [] };
          if (kind === 'type') {
            const { data: op, error: e2 } = await old.from('profiles').select('character, data').eq('id', oldId).single();
            if (e2) throw e2;
            const { inv = {}, ...rest } = op.data || {};
            me.data.inv = addInv(me.data.inv, inv);
            got.blocks = Object.values(inv).reduce((a, b) => a + b, 0);
            // 새 게임에서 아직 타자연습을 안 했으면 진도·건축물을 그대로 옮긴다
            if (!me.data.type || !me.data.type.blocks) me.data.type = { ...rest, character: op.character };
            const { data: ss } = await old.from('sessions').select('created_at, lang, level, play_ms, active_ms, keys, errors, words, blocks').eq('user_id', oldId);
            if (ss && ss.length) must(await sb.from('bm_sessions').insert(ss.map((s) => ({ ...s, user_id: uid }))));
            got.games.push('타자연습');
          } else {
            const { data: op, error: e2 } = await old.from('madang_profiles').select('points, chars').eq('id', oldId).single();
            if (e2) throw e2;
            me.points += op.points;
            me.chars = { ...(op.chars || {}), ...(me.chars || {}) };
            got.points = op.points;
            const { data: saves } = await old.from('madang_saves').select('game, trophies, level, data').eq('user_id', oldId);
            for (const s of saves || []) {
              const { data: mine } = await sb.from('bm_saves').select('game').eq('user_id', uid).eq('game', s.game).maybeSingle();
              if (mine) continue; // 새 게임에서 이미 한 놀이는 그대로 둔다
              must(await sb.from('bm_saves').insert({ user_id: uid, ...s }));
              got.games.push(s.game);
            }
          }
          must(await sb.from('bm_profiles').update({ points: me.points, chars: me.chars, data: me.data }).eq('id', uid));
          return got;
        } finally {
          await old.auth.signOut();
        }
      },
      myId: () => uid,
    };
  }

  // ----- 이 컴퓨터 전용 모드 (config.js가 비었을 때) -----
  const KEY = 'blockmadang.local';
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)) || null; } catch { db = null; }
  db = db || { users: {}, sessions: [], current: null };
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} };
  // 놀이터 창(iframe) 속 놀이가 같은 저장을 바꿀 수 있어서, 읽고 쓸 때마다 새로 읽는다
  const reload = () => { try { db = JSON.parse(localStorage.getItem(KEY)) || db; } catch {} };
  async function hash(username, pw) {
    const text = `blockmadang:${username}:${pw}`;
    if (window.crypto?.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 0; for (const c of text) h = (h * 31 + c.charCodeAt(0)) | 0;
    return 'x' + h;
  }
  const cur = () => db.users[db.current];
  const pub = (u) => ({ id: u.id, username: u.username, nickname: u.nickname, points: u.points, character: u.character, chars: u.chars, data: JSON.parse(JSON.stringify(u.data)) });
  return {
    online,
    async restore() { reload(); return cur() ? pub(cur()) : null; },
    async signUp(username, password, nickname) {
      check(username, password, nickname);
      if (db.users[username]) throw new Error('이미 있는 아이디예요. 다른 아이디를 골라요.');
      db.users[username] = { id: 'local-' + username, username, nickname, points: 0, character: 'kid', chars: { kid: true }, data: {}, saves: {}, pw: await hash(username, password) };
      db.current = username; persist();
      return pub(cur());
    },
    async signIn(username, password) {
      const u = db.users[username];
      if (!u || u.pw !== await hash(username, password)) throw new Error('아이디나 비밀번호가 틀렸어요.');
      db.current = username; persist();
      return pub(u);
    },
    async signOut() { db.current = null; persist(); },
    async saveProfile(p) {
      reload();
      if (!cur() || p.id !== cur().id) throw new Error('다른 아이디로 바뀌었어요. 새로고침해 주세요.');
      Object.assign(cur(), { nickname: p.nickname, points: p.points, character: p.character, chars: p.chars, data: JSON.parse(JSON.stringify(p.data)) });
      persist();
    },
    async loadGame(game) {
      reload();
      const saves = cur().saves;
      if (!saves[game]) { saves[game] = { trophies: 0, level: 1, data: {} }; persist(); }
      return saves[game];
    },
    async save(game, s) {
      reload();
      Object.assign(cur(), { points: s.points, character: s.character, chars: s.chars });
      cur().saves[game] = { trophies: s.trophies, level: Math.min(30, Math.max(1, s.level)), data: s.data };
      persist();
      return { trophies: s.trophies, level: cur().saves[game].level };
    },
    async leaderboard(game) {
      const rows = Object.values(db.users).flatMap((u) => Object.entries(u.saves).map(([g, s]) =>
        ({ id: u.id, nickname: u.nickname, character: u.character, game: g, trophies: s.trophies, level: s.level })));
      if (!game) return rows;
      return rows.filter((r) => r.game === game).sort((a, b) => b.trophies - a.trophies || b.level - a.level);
    },
    async addSession(rec) { reload(); db.sessions.push({ ...rec, user_id: cur().id, created_at: new Date().toISOString() }); persist(); },
    async mySessions() { return db.sessions.filter((s) => s.user_id === cur().id); },
    async typeLeaderboard() { return Object.values(db.users).map((u) => aggregate(u, db.sessions.filter((s) => s.user_id === u.id))); },
    async worlds() {
      return Object.values(db.users).filter((u) => u.data.type && u.data.type.worlds)
        .map((u) => ({ id: u.id, nickname: u.nickname, character: u.data.type.character || 'steve', worlds: u.data.type.worlds }));
    },
    async importOld() { throw new Error('예전 기록 가져오기는 온라인 모드에서만 돼요.'); },
    // 🌍 모두의 맵 (이 브라우저 안에서만, 규칙은 maps.sql과 같게)
    async listMaps() {
      reload();
      return (db.maps || []).map((m) => ({ id: m.id, owner: m.owner, nickname: (Object.values(db.users).find((u) => u.id === m.owner) || {}).nickname,
        title: m.title, kind: m.kind, size: m.size, clears: m.clears, best_ms: m.best_ms, created_at: m.created_at })).reverse();
    },
    async getMap(id) { reload(); return db.maps.find((m) => m.id === id); },
    async publishMap(m) {
      reload();
      db.maps = db.maps || [];
      if (db.maps.filter((x) => x.owner === cur().id).length >= 10) throw new Error('맵은 10개까지 올릴 수 있어요. 예전 맵을 지우고 올려요.');
      const id = (db.mapSeq = (db.mapSeq || 0) + 1);
      db.maps.push({ id, owner: cur().id, title: m.title, kind: m.kind, size: m.size.join(','), data: m.data, clears: 0, best_ms: null, earned: 0, clearsBy: {}, created_at: new Date().toISOString() });
      persist();
      return id;
    },
    async deleteMap(id) { reload(); db.maps = db.maps.filter((m) => !(m.id === id && m.owner === cur().id)); persist(); },
    async clearMap(id, ms) {
      reload();
      const m = db.maps.find((x) => x.id === id), me = cur().id;
      const first = !(me in m.clearsBy);
      m.clearsBy[me] = first ? ms : Math.min(m.clearsBy[me], ms);
      const reward = first && me !== m.owner ? 50 : 0;
      if (first) m.clears++;
      if (reward) m.earned += 10;
      m.best_ms = Math.min(m.best_ms || ms, ms);
      persist();
      return { first, reward };
    },
    async mapRanking(id) {
      reload();
      const m = db.maps.find((x) => x.id === id);
      return Object.entries(m.clearsBy).map(([uid, ms]) => ({ nickname: (Object.values(db.users).find((u) => u.id === uid) || {}).nickname, ms })).sort((a, b) => a.ms - b.ms).slice(0, 5);
    },
    async myMapEarnings() { reload(); return (db.maps || []).filter((m) => m.owner === cur().id).reduce((a, m) => a + m.earned, 0); },
    async collectMapEarnings() {
      reload();
      let v = 0;
      (db.maps || []).filter((m) => m.owner === cur().id).forEach((m) => { v += m.earned; m.earned = 0; });
      persist();
      return v;
    },
    // 국어사전 확인: 이 컴퓨터의 server.js가 대신 찾아본다
    async dictCheck(word) {
      try { return await (await fetch('/api/check?w=' + encodeURIComponent(word))).json(); }
      catch { return { ok: false, error: '사전 서버에 연결하지 못했어요 (node server.js 로 켰는지 확인).' }; }
    },
    async dictLearned() { try { return await (await fetch('/api/learned')).json(); } catch { return []; } },
    myId: () => cur()?.id,
  };
})();

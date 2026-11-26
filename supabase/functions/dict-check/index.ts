// 블록 마당 끝말잇기: 단어가 표준국어대사전에 「명사」로 있는지 확인하는 Supabase Edge Function.
// 브라우저는 국어사전 사이트를 직접 못 읽어서(CORS) 이 함수가 대신 찾아본다.
// 한 번 찾은 결과는 bm_dict 표에 남겨서 다음부터는 바로 답하고, 보스들도 그 단어를 배운다.
// 부르는 법: GET /functions/v1/dict-check?w=단어  →  { ok: true | false, error?: '...' }
// 설정: Verify JWT 끄기 (게임이 로그인 없이도 부를 수 있게)
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// 검색 결과에서 표제어가 단어와 똑같고 품사가 「명사」인 것이 있는지 본다 (server.js와 같은 방법)
const ENTRY = /class="t_blue1">\s*([^<]+?)\s*(?:<sup>\d+<\/sup>)?<\/a><span[^>]*>[^<]*<\/span>「([^」]+)」/g;
async function isNoun(word: string): Promise<boolean> {
  const res = await fetch('https://stdict.korean.go.kr/search/searchResult.do?pageSize=50&searchKeyword=' + encodeURIComponent(word),
    { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  if (!html.includes('찾기 결과')) throw new Error('사전 응답이 이상함');
  for (const m of html.matchAll(ENTRY)) {
    if (m[1].replace(/[-^ ]/g, '') === word && m[2] === '명사') return true;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { ...cors, 'Content-Type': 'application/json' } });
  const w = (new URL(req.url).searchParams.get('w') || '').trim();
  if (!/^[가-힣]{2,20}$/.test(w)) return json({ ok: false });

  const { data } = await db.from('bm_dict').select('ok').eq('word', w).maybeSingle();
  if (data) return json({ ok: data.ok });
  try {
    const ok = await isNoun(w);
    await db.from('bm_dict').upsert({ word: w, ok });
    return json({ ok });
  } catch {
    return json({ ok: false, error: '국어사전에 연결하지 못했어요. 잠시 뒤에 다시 써 보세요.' });
  }
});

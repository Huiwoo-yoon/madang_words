// 블록 마당 서버 (이 컴퓨터에서 해 볼 때): 파일을 보여 주고, 끝말잇기의 처음 보는 단어는 표준국어대사전에서 찾아본다.
// 실행: node server.js          →  http://localhost:4480  (config.js의 온라인 DB 사용)
//       node server.js --local  →  온라인 DB 없이 이 브라우저에만 저장 (테스트용)
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = +((process.argv.find((a) => a.startsWith('--port=')) || '').split('=')[1]) || 4480; // 예: --port=4481
const LOCAL = process.argv.includes('--local');
const ROOT = __dirname;
const CACHE_FILE = path.join(ROOT, 'kkeutmal', 'dict-cache.json'); // { 단어: true/false } 한 번 찾은 결과
let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch {}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.woff2': 'font/woff2' };

function fetchText(url, hops = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && hops < 3) {
        res.resume();
        return resolve(fetchText(new URL(res.headers.location, url).href, hops + 1));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve(body));
    }).on('error', reject).on('timeout', function () { this.destroy(new Error('timeout')); });
  });
}

// 표준국어대사전 검색 결과에서 표제어가 단어와 똑같고 품사가 「명사」인 것이 있는지 본다.
async function isNoun(word) {
  const url = 'https://stdict.korean.go.kr/search/searchResult.do?pageSize=50&searchKeyword=' + encodeURIComponent(word);
  const html = await fetchText(url);
  if (!html.includes('찾기 결과')) throw new Error('사전 응답이 이상함');
  const re = /class="t_blue1">\s*([^<]+?)\s*(?:<sup>\d+<\/sup>)?<\/a><span[^>]*>[^<]*<\/span>「([^」]+)」/g;
  for (const m of html.matchAll(re)) {
    const head = m[1].replace(/[-^ ]/g, '');
    if (head === word && m[2] === '명사') return true;
  }
  return false;
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/api/check') {
    const w = (u.searchParams.get('w') || '').trim();
    res.setHeader('Content-Type', 'application/json');
    if (!/^[가-힣]{2,}$/.test(w)) return res.end(JSON.stringify({ ok: false }));
    if (w in cache) return res.end(JSON.stringify({ ok: cache[w] }));
    try {
      const ok = await isNoun(w);
      cache[w] = ok;
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
      return res.end(JSON.stringify({ ok }));
    } catch (e) {
      return res.end(JSON.stringify({ ok: false, error: '사전에 연결하지 못했어요' }));
    }
  }
  if (u.pathname === '/api/learned') { // 사전에서 확인된 단어들 (보스도 배워서 쓴다)
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(Object.keys(cache).filter((k) => cache[k])));
  }
  if (LOCAL && u.pathname === '/config.js') { // 테스트: 온라인 DB를 끈다
    res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    return res.end('window.CONFIG = {};');
  }
  const file = path.join(ROOT, decodeURIComponent(u.pathname) + (u.pathname.endsWith('/') ? 'index.html' : ''));
  if (!file.startsWith(ROOT) || file === CACHE_FILE) { res.statusCode = 403; return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('없음'); }
    res.setHeader('Content-Type', (TYPES[path.extname(file)] || 'text/plain') + '; charset=utf-8');
    res.end(data);
  });
}).listen(PORT, () => console.log(`블록 마당${LOCAL ? " (테스트 모드)" : ""}: http://localhost:${PORT}`));

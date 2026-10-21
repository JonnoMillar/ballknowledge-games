// Pick-round server: serves this folder, and POST /pick saves {id, file} into picks.json.
// Usage: node .scratch/photo-test/server.cjs   then open http://127.0.0.1:8766/round.html
const http = require('http');
const fs = require('fs');
const path = require('path');
const D = __dirname;
const PICKS = path.join(D, 'picks.json');
const TYPES = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/pick') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 10_000) req.destroy(); });
    req.on('end', () => {
      try {
        const { id, file } = JSON.parse(body);
        if (!/^Q\d+$/.test(id) || (file !== null && typeof file !== 'string')) throw new Error('bad pick');
        const picks = fs.existsSync(PICKS) ? JSON.parse(fs.readFileSync(PICKS, 'utf8')) : {};
        picks[id] = file;
        fs.writeFileSync(PICKS, JSON.stringify(picks, null, 1));
        res.writeHead(204).end();
      } catch { res.writeHead(400).end(); }
    });
    return;
  }
  if (req.url === '/picks') {
    res.writeHead(200, { 'content-type': TYPES['.json'] });
    return res.end(fs.existsSync(PICKS) ? fs.readFileSync(PICKS) : '{}');
  }
  const file = path.join(D, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(D) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(8766, '127.0.0.1', () => console.log('http://127.0.0.1:8766/round.html'));

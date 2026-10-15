import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createProductHtmlHandler } from '../server/product-html.mjs';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('npm run preview:seo-html -- [--port 4321] [--public-config /private/public-api.json]');
  console.log('Loopback-only, noindex pilot; current retail reads, no database writes.');
  process.exit(0);
}
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--port', '--public-config'].includes(args[i]) || !args[i + 1]) throw Error('Unsupported argument; use --help');
  options[args[i]] = args[i + 1];
}
const port = Number(options['--port'] || 4321);
if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw Error('Invalid preview port');
const config = options['--public-config'] ? JSON.parse(await readFile(options['--public-config'], 'utf8'))
  : { url: process.env.VITE_PUBLIC_SUPABASE_URL, key: process.env.VITE_PUBLIC_SUPABASE_ANON_KEY };
const dist = resolve('dist');
const template = await readFile(resolve(dist, 'index.html'), 'utf8');
const renderer = await import(pathToFileURL(resolve('.seo-pilot/server/entry.mjs')).href);
const handle = createProductHtmlHandler({ template, supabaseUrl: config.url, publicKey: config.key, ...renderer });
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.xml': 'application/xml',
  '.json': 'application/json', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    const response = await handle(new Request(url, { method: req.method, headers: req.headers }));
    if (response) {
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(req.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
    const filename = resolve(dist, `.${decodeURIComponent(url.pathname)}`);
    let body;
    let type = 'text/html';
    if (filename.startsWith(dist + '/') && types[extname(filename)]) {
      try { body = await readFile(filename); type = types[extname(filename)]; } catch { /* SPA fallback. */ }
    }
    if (!body) body = template;
    res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, follow' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
    res.end('Временен проблем при зареждане.');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Noindex HTML pilot: http://127.0.0.1:${port}`));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

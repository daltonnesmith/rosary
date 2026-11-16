import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)), process.argv[2] ?? 'dist');
const port = Number(process.env.PORT ?? 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end('Invalid request'); return; }
  // Simulate repository hosting locally as well as root hosting.
  if (pathname === '/rosary') { res.writeHead(302, { Location: '/rosary/' }); res.end(); return; }
  pathname = pathname.replace(/^\/rosary\//, '/');
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(`${root}${path.sep}`)) { res.writeHead(403); res.end('Forbidden'); return; }
  try {
    const contents = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" });
    res.end(contents);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 500);
    res.end(error.code === 'ENOENT' ? 'Not found. Run npm run build first.' : 'Could not read the app file.');
    if (error.code !== 'ENOENT') console.error(error);
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Stillwater: http://localhost:${port}/rosary/`));

// Static server for the update test: serves one build, then POST /__swap serves the next.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

async function fileIn(root, urlPath) {
  const path = normalize(join(root, decodeURIComponent(urlPath)));
  if (path !== root && !path.startsWith(root + sep)) return null;
  try {
    return (await stat(path)).isFile() ? path : null;
  } catch {
    return null;
  }
}

/** @param {{ dirs: string[], port: number }} options */
export function startSwapServer({ dirs, port }) {
  const roots = dirs.map((d) => resolve(d));
  let current = 0;
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method === 'POST' && url.pathname === '/__swap') {
      current = Math.min(current + 1, roots.length - 1);
      res.writeHead(204).end();
      return;
    }
    const root = roots[current];
    const path = (await fileIn(root, url.pathname)) ?? join(root, 'index.html');
    const type = types[extname(path)] ?? 'application/octet-stream';
    const noCache = path.endsWith('sw.js') || type === 'text/html';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': noCache ? 'no-cache' : 'max-age=0' });
    res.end(await readFile(path));
  });
  return new Promise((done) => server.listen(port, '127.0.0.1', () => done(server)));
}

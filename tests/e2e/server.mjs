// dist/site をローカルで配信し、ブラウザ（Chromium）で開くための共通部品
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../dist/site');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.css': 'text/css'
};

export async function startServer() {
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(root, p.endsWith('/') ? p + 'index.html' : p);
    if (!file.startsWith(root) || !fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() };
}

export async function launch() {
  // CHROMIUM_PATH を指定すると、その Chromium を使う（GitHub Actions では指定不要）
  return chromium.launch({
    args: ['--autoplay-policy=no-user-gesture-required'],
    executablePath: process.env.CHROMIUM_PATH || undefined
  });
}

// 外部への通信（Firebase・フォント）は止めて、本番のランキングに書き込まないようにする
export async function newPage(
  browser,
  { viewport = { width: 390, height: 800 }, mobile = true, settings } = {}
) {
  const ctx = await browser.newContext({
    viewport,
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: mobile ? 2 : 1
  });
  await ctx.route(
    url => !/^http:\/\/127\.0\.0\.1/.test(url.toString()),
    r => r.abort()
  );
  await ctx.addInitScript(s => {
    localStorage.setItem('mrja-login', 'JH1ABC');
    localStorage.setItem('mrja', JSON.stringify({ myCall: 'JH1ABC', ...(s || {}) }));
  }, settings || null);
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e)));
  return page;
}

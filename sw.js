// JA CW Runner のサービスワーカー（オフライン対応）
// アプリを更新したら VERSION の数字を上げてください。
const VERSION = 'cw-runner-v13';
const SHELL = [
  './',
  './index.html',
  './config.js',
  './cwr-data.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon-48.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // ランキング（Firebase）の通信はキャッシュせず、そのまま通す
  if (/googleapis\.com$|firebaseio\.com$|firebaseapp\.com$/.test(url.hostname) && !url.hostname.startsWith('fonts.')) return;

  // 自サイトのファイル：通信できれば最新版、オフラインならキャッシュ
  if (url.origin === location.origin) {
    e.respondWith(
      // ブラウザの一時保存を使わず、毎回サーバーに最新かどうか確認する
      fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // フォントと Firebase のライブラリ：キャッシュ優先（オフラインでも表示が崩れないように）
  if (/fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com/.test(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return res;
      }))
    );
  }
});

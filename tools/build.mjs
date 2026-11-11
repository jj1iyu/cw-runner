// JA CW Runner のビルド
//   src/ の HTML・CSS・JS を組み立てて、次の2つを作ります。
//   dist/site/      … GitHub Pages で公開するサイト一式
//   dist/artifact/  … claude.ai 上のプレビュー用ページ（1枚のHTML＋実在局データ）
// 使い方: node tools/build.mjs   （VERSION を指定する場合は CWR_VERSION=xxx node tools/build.mjs）
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const r = (...p) => path.join(root, ...p);
const read = p => fs.readFileSync(r(p), 'utf8');

// --- 組み立て -----------------------------------------------------------
const template = read('src/index.html');
const css = read('src/css/app.css');
const jsFiles = fs
  .readdirSync(r('src/js'))
  .filter(f => f.endsWith('.js'))
  .sort();
const js = jsFiles.map(f => read(`src/js/${f}`)).join('');
const replaceOnce = (s, key, value) => {
  if (s.split(key).length !== 2) throw new Error(`テンプレートに ${key} が1つだけ必要です`);
  return s.replace(key, () => value);
};
const artifact = replaceOnce(replaceOnce(template, '@@CSS@@', css), '@@JS@@', js);

// --- 公開サイト用の index.html -----------------------------------------
const title = artifact.match(/<title>.*?<\/title>/)[0];
let body = artifact.replace(title, '');
body = body.replace(/<meta name="claude:viewport-fit-sides"[^>]*>\n?/, '');
// config.js（Firebase の設定）を本体スクリプトより前に読み込む
body = replaceOnce(body, '\n<script>\n(()=>{', '\n<script src="config.js"></script>\n<script>\n(()=>{');
const head = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${title}
<meta name="description" content="スマホでもPCでも遊べるCWコンテスト練習シミュレータ（ALL JA／DX）">
<meta name="theme-color" content="#0f1b2d">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="48x48" href="favicon-48.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="JA CW Runner">
<style>
:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);box-sizing:border-box}
body{margin:0;font-size:14px}
img{max-width:100%}
[hidden]{display:none!important}
</style>
</head>
<body>
`;
const tail = `
<script>
if('serviceWorker' in navigator){
  addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
</script>
</body>
</html>
`;
const site = head + body + tail;

// --- サービスワーカーの版（更新のたびに自動で変わる） --------------------
let version = process.env.CWR_VERSION;
if (!version) {
  try {
    version = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
  } catch {
    version = String(Date.now());
  }
}
const sw = replaceOnce(read('src/sw.js'), '__VERSION__', `cw-runner-${version}`);

// --- 書き出し ------------------------------------------------------------
const out = (p, data) => {
  fs.mkdirSync(path.dirname(r(p)), { recursive: true });
  fs.writeFileSync(r(p), data);
};
fs.rmSync(r('dist'), { recursive: true, force: true });
out('dist/site/index.html', site);
out('dist/site/sw.js', sw);
for (const f of fs.readdirSync(r('public'))) fs.copyFileSync(r('public', f), r('dist/site', f));
fs.copyFileSync(r('data/cwr-data.js'), r('dist/site/cwr-data.js'));
out('dist/artifact/index.html', artifact);
fs.copyFileSync(r('data/cwr-data.js'), r('dist/artifact/cwr-data.js'));
console.log(`built: ${jsFiles.length} js files, site ${site.length} chars, version cw-runner-${version}`);

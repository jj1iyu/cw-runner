// いろいろな画面サイズで、ボタンや表示が画面からはみ出さないか検査する
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, newPage } from './server.mjs';

const SIZES = [
  ['iPhone SE（バー表示）', 375, 548, true],
  ['iPhone SE', 375, 667, true],
  ['iPhone 15（バー表示）', 393, 659, true],
  ['iPhone 15', 393, 852, true],
  ['iPhone Pro Max', 430, 932, true],
  ['小型Android', 360, 640, true],
  ['Pixel', 412, 915, true],
  ['最小幅 320', 320, 568, true],
  ['iPhone 横', 844, 390, true],
  ['iPhone SE 横', 667, 375, true],
  ['Pro Max 横', 932, 430, true],
  ['Android 横', 640, 360, true],
  ['iPad 縦', 820, 1180, true],
  ['iPad 横', 1180, 820, true],
  ['Android タブレット', 800, 1280, true],
  ['PC 小窓', 1000, 600, false],
  ['ノートPC', 1366, 768, false],
  ['PC', 1920, 1080, false],
  ['PC 縦長窓', 700, 900, false]
];

const CHECK = () => {
  const vw = innerWidth,
    vh = innerHeight,
    out = [];
  const vis = e => {
    const cs = getComputedStyle(e);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && e.offsetParent !== null;
  };
  for (const q of [
    '#meBtn',
    '#led',
    '#boardBtn',
    '#setBtn',
    '#runBtn',
    '#sTime',
    '#sRate',
    '#log',
    '#fCall',
    '#fNr',
    '.k.enter',
    '[data-k=ESC]',
    '[data-k=WIPE]',
    '.fk',
    '#pad .k'
  ])
    for (const e of document.querySelectorAll(q)) {
      if (!vis(e)) continue;
      const r = e.getBoundingClientRect();
      if (r.left < -0.5 || r.top < -0.5 || r.right > vw + 0.5 || r.bottom > vh + 0.5) {
        out.push(`${q} はみ出し`);
        break;
      }
      if (q.startsWith('.') || q.startsWith('#pad'))
        if (r.height < 26) {
          out.push(`${q} 小さすぎ`);
          break;
        }
    }
  if (document.getElementById('log').getBoundingClientRect().height < 40) out.push('ログ欄が狭い');
  if (document.documentElement.scrollWidth > vw + 1) out.push('横スクロールあり');
  const hb = document.querySelector('header').getBoundingClientRect(),
    sb = document.querySelector('.stats').getBoundingClientRect();
  if (hb.bottom > sb.top + 1 && !(hb.left >= sb.right || sb.left >= hb.right))
    out.push('ヘッダーと得点表示が重なる');
  if (hb.top < 8) out.push('上端に近すぎる');
  return out;
};

let server, browser;
before(async () => {
  server = await startServer();
  browser = await launch();
});
after(async () => {
  await browser.close();
  server.close();
});

for (const [name, w, h, mobile] of SIZES)
  test(`画面サイズ：${name} ${w}×${h}`, async () => {
    const page = await newPage(browser, { viewport: { width: w, height: h }, mobile });
    await page.goto(server.url);
    assert.deepEqual(await page.evaluate(CHECK), []);
    for (const [btn, sheet, back] of [
      ['#setBtn', '#sheet', '#closeSet'],
      ['#boardBtn', '#boardSheet', '#boardBack']
    ]) {
      await page.click(btn);
      assert.ok(
        await page.evaluate(s => document.querySelector(s).scrollWidth <= innerWidth + 1, sheet),
        `${sheet} 横はみ出し`
      );
      await page.click(back);
    }
    assert.deepEqual(page.errors, []);
  });

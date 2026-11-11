// アプリを実際にブラウザで動かす検査（npm run test:e2e）
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, newPage } from './server.mjs';

let server, browser;
before(async () => {
  server = await startServer();
  browser = await launch();
});
after(async () => {
  await browser.close();
  server.close();
});

test('1局交信して OK と判定される（ALL JA・シングルコール）', async () => {
  const page = await newPage(browser, { settings: { wpm: 50, wpmVar: false } });
  await page.goto(server.url + '?e2e');
  await page.click('#runBtn');
  await page.keyboard.press('Enter'); // CQ
  await page.waitForFunction(() => window.__cwr.stations.some(s => s.state === 'calling'), null, {
    timeout: 15000
  });
  const st = await page.evaluate(() => {
    const s = window.__cwr.stations.find(x => x.state === 'calling');
    return { call: s.call, nr: s.nr };
  });
  await page.keyboard.type(st.call);
  await page.keyboard.press('Enter'); // コール＋5NN＋ナンバー
  await page.waitForFunction(
    c => window.__cwr.stations.some(s => s.call === c && s.state === 'exch'),
    st.call,
    { timeout: 15000 }
  );
  await page.keyboard.type(st.nr);
  await page.keyboard.press('Enter'); // TU とログ
  const log = await page.evaluate(() => window.__cwr.log[0]);
  assert.equal(log.status, 'ok', JSON.stringify(log));
  assert.equal(await page.textContent('#sQso'), '1');
  assert.deepEqual(page.errors, []);
});

test('打ち間違えると「誤」と判定され、正しいコールが表示される', async () => {
  const page = await newPage(browser, { settings: { wpm: 50, wpmVar: false } });
  await page.goto(server.url + '?e2e');
  await page.click('#runBtn');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__cwr.stations.some(s => s.state === 'calling'), null, {
    timeout: 15000
  });
  const st = await page.evaluate(() => {
    const s = window.__cwr.stations.find(x => x.state === 'calling');
    return { call: s.call, nr: s.nr };
  });
  await page.keyboard.type(st.call);
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    c => window.__cwr.stations.some(s => s.call === c && s.state === 'exch'),
    st.call,
    { timeout: 15000 }
  );
  await page.keyboard.type(st.nr.startsWith('9') ? '10M' : '99H'); // わざと違うナンバー
  await page.keyboard.press('Enter');
  const log = await page.evaluate(() => window.__cwr.log[0]);
  assert.equal(log.status, 'bust');
  assert.match(await page.textContent('#log'), new RegExp(st.nr));
});

test('送信中に押したキーは順番待ちになり、送信中は受信音が消える', async () => {
  const page = await newPage(browser);
  await page.addInitScript(() => {
    window.__ramps = [];
    const o = AudioParam.prototype.linearRampToValueAtTime;
    AudioParam.prototype.linearRampToValueAtTime = function (v, t) {
      if (v === 0 || v === 1) window.__ramps.push(v);
      return o.call(this, v, t);
    };
  });
  await page.goto(server.url + '?e2e');
  await page.click('#runBtn');
  await page.evaluate(() => (window.__ramps.length = 0));
  await page.keyboard.press('F1');
  await page.keyboard.press('F4');
  assert.equal(await page.textContent('#led'), 'TX+1');
  await page.waitForFunction(
    () =>
      document.getElementById('led').textContent === 'TX' &&
      !document.getElementById('led').classList.contains('on'),
    null,
    { timeout: 20000 }
  );
  const ramps = await page.evaluate(() => window.__ramps);
  assert.ok(ramps.includes(0) && ramps.includes(1), `受信音のミュートと復帰: ${ramps}`);
});

test('停止すると音の処理が止まる', async () => {
  const page = await newPage(browser);
  await page.addInitScript(() => {
    const A = window.AudioContext;
    window.__ctx = [];
    window.AudioContext = function (...a) {
      const c = new A(...a);
      window.__ctx.push(c);
      return c;
    };
    window.AudioContext.prototype = A.prototype;
  });
  await page.goto(server.url + '?e2e');
  await page.click('#runBtn');
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__ctx[0].state), 'running');
  await page.click('#runBtn');
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__ctx[0].state), 'suspended');
});

test('5分たつとコンテストが自動で終わる', async () => {
  const page = await newPage(browser);
  await page.clock.install();
  await page.goto(server.url + '?e2e');
  await page.click('#runBtn');
  await page.keyboard.press('Enter');
  await page.clock.runFor(5 * 60 * 1000 + 2000);
  assert.equal(await page.evaluate(() => window.__cwr.running), false);
  assert.match(await page.textContent('#sTime'), /^5:00$/);
});

test('初期設定に戻すと、コールサイン以外が初期値になる', async () => {
  const page = await newPage(browser, { settings: { wpm: 40, myNr: '13M', noise: 0.5 } });
  await page.goto(server.url);
  await page.click('#setBtn');
  assert.equal(await page.inputValue('#o_wpm'), '40');
  await page.click('#resetSet');
  await page.click('#resetYes');
  assert.equal(await page.inputValue('#o_wpm'), '24');
  assert.equal(await page.inputValue('#o_myNr'), '10H');
  assert.equal(await page.textContent('#w_noise'), '5%');
  assert.equal(await page.textContent('#meBtn'), 'JH1ABC');
});

test('ランキング画面：スコアと練習量を切り替えられる（接続なしでも壊れない）', async () => {
  const page = await newPage(browser);
  await page.goto(server.url);
  await page.click('#boardBtn');
  await page.click('#segKind button[data-v=practice]');
  assert.equal(await page.evaluate(() => document.getElementById('scoreTabs').hidden), true);
  await page.click('#segKind button[data-v=score]');
  assert.equal(await page.evaluate(() => document.getElementById('scoreTabs').hidden), false);
  assert.deepEqual(page.errors, []);
});

test('意見の画面は開けて、未接続のときは分かりやすく伝える', async () => {
  const page = await newPage(browser);
  await page.goto(server.url);
  await page.click('#setBtn');
  await page.click('#fbOpen1');
  await page.fill('#fbText', 'テスト');
  await page.click('#fbSend');
  assert.match(await page.textContent('#fbMsg'), /つながっていません/);
});

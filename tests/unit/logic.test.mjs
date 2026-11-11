import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLogic, loadData } from './load.mjs';

const L = loadLogic();

test('ナンバーの正規化：カット・RST付き・ゾーン', () => {
  const same = (a, b) => assert.equal(L.normNr(a), L.normNr(b), `${a} と ${b}`);
  same('13M', '13M');
  same('1TM', '10M');
  same('5NN 1TM', '10M');
  same('599 13M', '13M');
  same('ATM', '10M');
  same('1TNM', '109M');
  same('A4', '14');
  same('T5', '5');
  same('05', '5');
  same('599 25', '25');
  assert.notEqual(L.normNr('13M'), L.normNr('13H'));
  assert.notEqual(L.normNr('14'), L.normNr('15'));
});

test('カットナンバーの作り方', () => {
  assert.equal(L.cut('10M'), '1TM');
  assert.equal(L.cut('109M'), '1TNM');
  assert.equal(L.cut('10M', true), 'ATM');
  assert.equal(L.cut('25'), '25');
});

test('部分コールと打ち間違いの判定', () => {
  assert.ok(L.matches('JA1?BC', 'JA1ABC'));
  assert.ok(!L.matches('JA1?BC', 'JA2ABC'));
  assert.ok(L.matches('ABC', 'JA1ABC'));
  assert.ok(L.matches('JA1ABD', 'JA1ABC'));
  assert.ok(!L.matches('JR6XYZ', 'JA1ABC'));
});

test('ランキングのカテゴリと上限（1時間400局ペース）', () => {
  assert.equal(L.keyOf('ja', 'pile', '5'), 'pile-5');
  assert.equal(L.keyOf('dx', 'single', '60'), 'dx-single-60');
  assert.deepEqual({ ...L.QMAX }, { 5: 34, 10: 67, 30: 200, 60: 400 });
  const ok = (key, q, m) => L.validRun(key, { score: q * m, q, mult: m });
  assert.ok(ok('pile-5', 34, 20));
  assert.ok(!ok('pile-5', 35, 20));
  assert.ok(ok('dx-single-60', 400, 200));
  assert.ok(!ok('single-10', 50, 61));
  assert.ok(!L.validRun('single-10', { score: 999, q: 10, mult: 10 }), '得点 ≠ QSO×マルチ');
  assert.ok(!L.validRun('single-15', { score: 4, q: 2, mult: 2 }), '存在しないカテゴリ');
  assert.ok(!L.validRun('single-5', { score: '4', q: 2, mult: 2 }), '数字以外');
});

test('練習回数：同じ日・翌日・月替わり・1日の上限', () => {
  const t = Date.UTC(2026, 10, 12, 3); // 2026-11-12 12:00 JST
  const A = loadLogic({ now: t });
  let r = A.countRun({ call: 'JJ1IYU', plays: 2, updatedAt: 1, runs: {} }); // 旧形式の記録
  assert.equal(r.counted, true);
  assert.equal(r.doc.plays, 3);
  assert.equal(r.doc.monthPlays, 1);
  assert.equal(r.doc.month, '2026-11');
  assert.equal(r.doc.lastDay, '2026-11-12');
  r = A.countRun(r.doc);
  assert.equal(r.doc.monthPlays, 2);
  assert.equal(r.doc.dayPlays, 2);
  assert.equal(r.doc.streak, 1, '同じ日は連続日数を増やさない');
  assert.equal(A.countRun({ ...r.doc, lastDay: '2026-11-11', streak: 3 }).doc.streak, 4, '昨日も練習→連続');
  assert.equal(A.countRun({ ...r.doc, lastDay: '2026-11-01', streak: 9 }).doc.streak, 1, '間が空いたら1から');
  assert.equal(
    A.countRun({ ...r.doc, month: '2026-10', monthPlays: 50 }).doc.monthPlays,
    1,
    '月が変わったら0から'
  );
  const full = A.countRun({ ...r.doc, dayPlays: A.DAY_MAX });
  assert.equal(full.counted, false, '1日の上限を超えたら数えない');
  assert.equal(A.practiceOf({ month: '2026-10', monthPlays: 9, plays: 9 }).monthPlays, 0, '先月分は今月0回');
});

test('日付は日本時間で区切る', () => {
  const A = loadLogic({ now: Date.UTC(2026, 10, 30, 15, 30) }); // 12/1 0:30 JST
  assert.equal(A.jstDay(), '2026-12-01');
  assert.equal(A.jstMonth(), '2026-12');
});

test('称号の段階', () => {
  assert.equal(L.TIERS[L.tierOf(0)][1], 'SWL');
  assert.equal(L.TIERS[L.tierOf(100)][1], 'コンテスター');
  assert.equal(L.TIERS[L.tierOf(9999)][1], 'レジェンド');
});

test('コールサインの形', () => {
  for (const c of ['JA1ZZZ', 'JJ1IYU', '7K4ABC/1', 'JA8AJE/QRP', 'K1ABC']) assert.ok(L.validCall(c), c);
  for (const c of ['HELLO', '123', 'JA1', 'JA1ABCDEFGHIJ']) assert.ok(!L.validCall(c), c);
});

test('初期設定', () => {
  const d = L.DEF;
  assert.equal(d.myNr, '10H');
  assert.equal(d.mode, 'single');
  assert.equal(d.dur, '5');
  assert.equal(d.wpm, 24);
  assert.equal(d.noise, 0.05);
  assert.equal(d.sigP, 0.5);
  for (const k of ['qsb', 'qrm', 'qrn', 'flutter']) assert.equal(d[k], false, k);
});

test('実在局データの形', () => {
  const D = loadData();
  const ja = D.ja.split(';').map(x => x.split(','));
  assert.ok(ja.length > 1500, `ALL JA ${ja.length}局`);
  for (const [call, nr] of ja) {
    assert.match(call, /^[A-Z0-9/]+$/);
    assert.match(nr, /^\d{1,3}[HMLP]$/, call);
  }
  const dx = D.dx.split(';').map(x => x.split(','));
  assert.ok(dx.length > 5000, `DX ${dx.length}局`);
  for (const [call, zone, ent] of dx) {
    assert.ok(+zone >= 1 && +zone <= 40, `${call} zone ${zone}`);
    assert.ok(D.dxEnts[+ent], `${call} entity`);
  }
});

test('ランダム生成のDX局', () => {
  for (let i = 0; i < 500; i++) {
    const g = L.genDX();
    assert.match(g.call, /^[A-Z0-9]+$/);
    assert.ok(g.zone >= 1 && g.zone <= 40);
  }
});

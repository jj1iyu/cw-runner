// Firestore のルール（firestore.rules）を、手元のエミュレータで検査する
// 実行: npm run test:rules   （Java 11 以上が必要）
import test, { before, after, beforeEach } from 'node:test';
import fs from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, getDocs, collection, addDoc } from 'firebase/firestore';

let env;
const jst = t => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-cw-runner',
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') }
  });
});
after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const db = uid => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();
const run = (q, m) => ({ score: q * m, q, mult: m, rate: 300, wpm: 24, act: 4, at: Date.now() });
// 練習1回目を完走した直後の、正しい形の記録
const first = (over = {}) => {
  const now = Date.now();
  return {
    call: 'JA1ABC',
    runs: { 'single-5': run(20, 10) },
    plays: 1,
    updatedAt: now,
    month: jst(now).slice(0, 7),
    monthPlays: 1,
    lastDay: jst(now),
    dayPlays: 1,
    streak: 1,
    ...over
  };
};
const seed = async (uid, data) =>
  env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'scores', uid), data));

test('ランキングは誰でも読める', async () => {
  await seed('u1', first());
  await assertSucceeds(getDocs(collection(db(null), 'scores')));
});

test('自分の記録は書ける／他人の記録は書けない／ログインなしは書けない', async () => {
  await assertSucceeds(setDoc(doc(db('u1'), 'scores', 'u1'), first()));
  await assertFails(setDoc(doc(db('u1'), 'scores', 'u2'), first()));
  await assertFails(setDoc(doc(db(null), 'scores', 'u1'), first()));
});

test('上限を超える記録・計算の合わない記録・知らないカテゴリは書けない', async () => {
  const w = runs => setDoc(doc(db('u1'), 'scores', 'u1'), first({ runs }));
  await assertSucceeds(w({ 'pile-5': run(34, 60) }));
  await assertFails(w({ 'pile-5': run(35, 10) }));
  await assertFails(w({ 'single-10': run(10, 61) }));
  await assertFails(w({ 'single-10': { ...run(10, 10), score: 999 } }));
  await assertFails(w({ 'single-15': run(2, 2) }));
  await assertFails(w({ 'single-5': { ...run(2, 2), rate: 'x'.repeat(5000) } }));
});

test('余計な項目・長すぎるコールは書けない', async () => {
  await assertFails(setDoc(doc(db('u1'), 'scores', 'u1'), first({ admin: true })));
  await assertFails(setDoc(doc(db('u1'), 'scores', 'u1'), first({ call: 'JA1ABCDEFGHIJ' })));
});

test('練習回数：1回ずつしか増やせない・間隔が必要・水増しできない', async () => {
  const before = Date.now() - 10 * 60e3;
  const base = first({ updatedAt: before, lastDay: jst(before), month: jst(before).slice(0, 7) });
  await seed('u1', base);
  const now = Date.now();
  const next = over =>
    setDoc(doc(db('u1'), 'scores', 'u1'), {
      ...base,
      plays: 2,
      updatedAt: now,
      month: jst(now).slice(0, 7),
      monthPlays: 2,
      lastDay: jst(now),
      dayPlays: jst(now) === base.lastDay ? 2 : 1,
      streak: base.streak,
      ...over
    });
  await assertFails(next({ plays: 3 }), '一度に2回');
  await assertFails(next({ monthPlays: 50 }), '今月分の水増し');
  await assertFails(next({ dayPlays: 31 }), '1日31回');
  await assertFails(next({ streak: 10 }), '連続日数の水増し');
  await assertFails(next({ updatedAt: now + 3600e3 }), '時計が大きくずれている');
  await assertSucceeds(next({}), '正しい1回分');
});

test('前回の完走から4分30秒以内の加算はできない', async () => {
  const base = first({ updatedAt: Date.now() - 60e3 });
  await seed('u1', base);
  await assertFails(
    setDoc(doc(db('u1'), 'scores', 'u1'), {
      ...base,
      plays: 2,
      updatedAt: Date.now(),
      monthPlays: 2,
      dayPlays: 2
    })
  );
});

test('回数を増やさない書き込み（コール変更）はできる', async () => {
  const base = first({ updatedAt: Date.now() - 60e3 });
  await seed('u1', base);
  await assertSucceeds(setDoc(doc(db('u1'), 'scores', 'u1'), { ...base, call: 'JA1XYZ' }));
});

test('古い版のアプリの形（練習回数の項目なし）は書けない', async () => {
  await assertFails(
    setDoc(doc(db('u1'), 'scores', 'u1'), { call: 'JA1ABC', runs: {}, plays: 1, updatedAt: Date.now() })
  );
});

test('意見：送れるが読めない・形が正しくないものは送れない', async () => {
  const fb = (uid, over = {}) =>
    addDoc(collection(db(uid), 'feedback'), {
      cat: 'idea',
      text: 'テスト',
      call: 'JA1ABC',
      info: 'ALL JA / iOS',
      at: Date.now(),
      uid,
      ...over
    });
  await assertSucceeds(fb('u1'));
  await assertFails(getDocs(collection(db('u1'), 'feedback')));
  await assertFails(fb('u1', { cat: 'spam' }));
  await assertFails(fb('u1', { uid: 'someone-else' }));
  await assertFails(fb('u1', { text: 'x'.repeat(1001) }));
  await assertFails(fb(null));
});

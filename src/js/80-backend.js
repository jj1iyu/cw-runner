// ---------- ランキング ----------
let GA = null;
const track = (n, p) => {
  try {
    GA && GA.logEvent(n, p || {});
  } catch (e) {}
};
let BE = null,
  ME = null,
  boardData = [],
  myDoc = null,
  dbState = 'wait';
const BV = { kind: 'score', contest: S.contest, mode: S.mode, dur: +S.dur ? String(S.dur) : '10' };
const loadScript = src =>
  new Promise((ok, ng) => {
    const e = document.createElement('script');
    e.src = src;
    e.onload = ok;
    e.onerror = ng;
    document.head.appendChild(e);
  });
// ランキングの保存先：claude.ai上ではそのデータ機能、自サイトでは config.js の Firebase、どちらも無ければ端末内のみ
async function connectClaude() {
  if (!window.claude || !window.claude.use) return null;
  const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
  const id = user ? await user.id() : null;
  if (!db || !id) return null;
  const col = db.collection('scores');
  return {
    id,
    watch: (cb, err) =>
      col.onSnapshot(sn => cb(sn.docs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }))), err),
    save: data => col.doc(id).set(data),
    load: async () => {
      const d = await col.doc(id).get();
      return d.exists ? { id, ...d.data() } : null;
    },
    feedback: data =>
      db
        .collection(`feedback/${id}/items`)
        .doc(Date.now().toString(36) + Math.random().toString(36).slice(2, 8))
        .set({ ...data, uid: id })
  };
}
async function connectFirebase() {
  const cfg = window.CW_RUNNER_FIREBASE;
  if (!cfg || !cfg.apiKey) return null;
  const v = '10.12.2',
    b = `https://www.gstatic.com/firebasejs/${v}/`;
  await loadScript(b + 'firebase-app-compat.js');
  await Promise.all([
    loadScript(b + 'firebase-auth-compat.js'),
    loadScript(b + 'firebase-firestore-compat.js')
  ]);
  const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
  // ボットチェック（App Check）：ランキングや意見の通信が本物のページから来たかを確かめる
  if (cfg.appCheckKey) {
    try {
      await loadScript(b + 'firebase-app-check-compat.js');
      app.appCheck().activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(cfg.appCheckKey), true);
    } catch (e) {}
  }
  if (cfg.measurementId)
    loadScript(b + 'firebase-analytics-compat.js')
      .then(() => {
        try {
          GA = app.analytics();
        } catch (e) {}
      })
      .catch(() => {});
  const cred = await app.auth().signInAnonymously();
  const id = cred.user.uid,
    fs = app.firestore(),
    col = fs.collection('scores');
  return {
    id,
    watch: (cb, err) => col.onSnapshot(sn => cb(sn.docs.map(d => ({ id: d.id, ...d.data() }))), err),
    save: data => col.doc(id).set(data),
    load: async () => {
      const d = await col.doc(id).get();
      return d.exists ? { id, ...d.data() } : null;
    },
    feedback: data => fs.collection('feedback').add({ ...data, uid: id })
  };
}
(async () => {
  try {
    BE = await connectClaude();
  } catch (e) {
    BE = null;
  }
  if (!BE) {
    try {
      BE = await connectFirebase();
    } catch (e) {
      BE = null;
    }
  }
  if (!BE) {
    dbState = 'off';
    renderBoard();
    return;
  }
  ME = BE.id;
  BE.watch(
    list => {
      boardData = list;
      myDoc = boardData.find(x => x.id === ME) || null;
      dbState = 'on';
      renderBoard();
    },
    () => {
      dbState = 'off';
      BE = null;
      renderBoard();
    }
  );
})();

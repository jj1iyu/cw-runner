// ---------- ログイン ----------
let logged = null;
try {
  logged = localStorage.getItem('mrja-login');
} catch (e) {}
function renderMe() {
  $('meBtn').textContent = S.myCall;
}
function openLogin() {
  $('loginCall').value = logged ? S.myCall : '';
  $('loginErr').textContent = '';
  $('loginSheet').hidden = false;
  setTimeout(() => $('loginCall').focus(), 50);
}
$('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const c = $('loginCall').value.toUpperCase().replace(/\s+/g, '');
  if (!validCall(c)) {
    $('loginErr').textContent = 'コールサインの形になっていません（例 JA1ZZZ、7K4ABC/1）';
    return;
  }
  S.myCall = c;
  save();
  logged = c;
  try {
    localStorage.setItem('mrja-login', c);
  } catch (e) {}
  $('loginSheet').hidden = true;
  renderMe();
  if (BE && myDoc && myDoc.call !== c) {
    const d = docOf(myDoc, { call: c });
    BE.save(d)
      .then(() => {
        myDoc = { ...d, id: ME };
      })
      .catch(() => {});
  }
});
$('meBtn').addEventListener('click', () => {
  if (running) {
    toast('停止してから変更してください');
    return;
  }
  openLogin();
});
$('o_myCall').addEventListener('change', () => {
  const c = $('o_myCall').value.toUpperCase();
  if (!validCall(c)) {
    S.myCall = logged || DEF.myCall;
    save();
    $('o_myCall').value = S.myCall;
    toast('コールサインの形になっていません');
  } else {
    logged = c;
    try {
      localStorage.setItem('mrja-login', c);
    } catch (e) {}
    if (BE && myDoc && myDoc.call !== c) {
      const d = docOf(myDoc, { call: c });
      BE.save(d)
        .then(() => {
          myDoc = { ...d, id: ME };
        })
        .catch(() => {});
    }
  }
  renderMe();
});

// ---------- 設定画面 ----------
const fmtO = {
  act: v => v,
  wpm: v => v + ' WPM',
  pitch: v => v + ' Hz',
  bw: v => v + ' Hz',
  vol: v => Math.round(v * 100) + '%',
  mon: v => Math.round(v * 100) + '%',
  sigP: v => Math.round(v * 100) + '%',
  noise: v => Math.round(v * 100) + '%'
};
function loadForm() {
  for (const k in DEF) {
    const el = $('o_' + k);
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = !!S[k];
    else el.value = S[k];
    if (fmtO[k]) $('w_' + k).textContent = fmtO[k](S[k]);
  }
}
document.querySelectorAll('[id^="o_"]').forEach(el => {
  el.addEventListener('input', () => {
    const k = el.id.slice(2);
    let v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
    if (k === 'myZone')
      v = String(v)
        .replace(/[^0-9]/g, '')
        .slice(0, 2);
    if (k === 'myCall' || k === 'myNr')
      v = String(v)
        .toUpperCase()
        .replace(/[^A-Z0-9\/]/g, '');
    S[k] = v;
    if (fmtO[k]) $('w_' + k).textContent = fmtO[k](v);
    save();
    applyAudio();
    if (k === 'dur' && !running) updStats();
  });
});
$('setBtn').addEventListener('click', () => {
  loadForm();
  $('sheet').hidden = false;
});
const closeSet = () => {
  $('sheet').hidden = true;
  if (!S.myCall) {
    S.myCall = DEF.myCall;
    save();
  }
};
$('closeSet').addEventListener('click', closeSet);
const resetUI = on => {
  $('resetSet').hidden = on;
  $('resetYes').hidden = !on;
  $('resetNo').hidden = !on;
};
$('resetSet').addEventListener('click', () => {
  if (running) {
    toast('停止してから変更してください');
    return;
  }
  resetUI(true);
});
$('resetNo').addEventListener('click', () => resetUI(false));
$('resetYes').addEventListener('click', () => {
  const call = S.myCall;
  S = { ...DEF, myCall: call };
  save();
  loadForm();
  applyAudio();
  applyContest();
  updStats();
  resetUI(false);
  toast('初期設定に戻しました');
});
$('backSet').addEventListener('click', closeSet);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('sheet').hidden) closeSet();
});

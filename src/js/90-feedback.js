// ---------- 意見を送る ----------
let fbCat = 'idea',
  fbBusy = false;
function openFb() {
  $('fbMsg').textContent = '';
  $('fbMsg').className = 'fb-msg';
  $('fbFrom').textContent = '送信者：' + S.myCall;
  $('fbSheet').hidden = false;
}
const devInfo = () => {
  const u = navigator.userAgent;
  const os = /iPhone|iPad/.test(u)
    ? 'iOS'
    : /Android/.test(u)
      ? 'Android'
      : /Mac/.test(u)
        ? 'Mac'
        : /Windows/.test(u)
          ? 'Windows'
          : 'other';
  return `${os} / ${innerWidth}x${innerHeight}${matchMedia('(display-mode: standalone)').matches ? ' / app' : ''}`;
};
$('fbOpen1').addEventListener('click', () => {
  $('sheet').hidden = true;
  openFb();
});
$('fbOpen2').addEventListener('click', openFb);
$('fbBack').addEventListener('click', () => ($('fbSheet').hidden = true));
$('fbCat').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  fbCat = b.dataset.v;
  for (const x of $('fbCat').children) x.setAttribute('aria-pressed', x === b);
});
$('fbText').addEventListener('input', () => {
  $('fbCount').textContent = `${$('fbText').value.length} / 1000`;
});
$('fbForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (fbBusy) return;
  const text = $('fbText').value.trim(),
    msg = $('fbMsg');
  if (text.length < 2) {
    msg.className = 'fb-msg ng';
    msg.textContent = '内容を書いてください';
    return;
  }
  if (!BE || !BE.feedback) {
    msg.className = 'fb-msg ng';
    msg.textContent = '送信先につながっていません。通信状態を確認して、もう一度開いてください。';
    return;
  }
  fbBusy = true;
  $('fbSend').disabled = true;
  msg.className = 'fb-msg';
  msg.textContent = '送信しています…';
  try {
    await BE.feedback({
      cat: fbCat,
      text: text.slice(0, 1000),
      call: String(S.myCall).slice(0, 12),
      info: `${contestLabel(S.contest)} ${modeLabel(S.mode)} ${S.wpm}WPM / ${devInfo()}`.slice(0, 200),
      at: Date.now()
    });
    $('fbText').value = '';
    $('fbCount').textContent = '0 / 1000';
    msg.className = 'fb-msg ok';
    msg.textContent = '送信しました。ありがとうございます！';
    track('feedback_send', { cat: fbCat });
  } catch (err) {
    msg.className = 'fb-msg ng';
    msg.textContent = '送信できませんでした。時間をおいてもう一度試してください。';
  }
  fbBusy = false;
  $('fbSend').disabled = false;
});

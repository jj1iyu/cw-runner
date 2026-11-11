// ---------- キー ----------
const FK = [
  ['F1', 'CQ', 'CQ'],
  ['F2', 'NR', '交換'],
  ['F3', 'TU', 'TU'],
  ['F4', 'MY', '自局'],
  ['F5', 'HIS', '相手'],
  ['F6', 'B4', 'B4'],
  ['F7', 'Q', '?'],
  ['F8', 'AGN', 'NR?']
];
$('fkeys').innerHTML = FK.map(
  ([f, k, l]) => `<button class="k fk" data-k="${k}" type="button">${l}<small>${f}</small></button>`
).join('');
const rows = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL⌫', 'ZXCVBNM/?␣'];
$('pad').innerHTML = rows
  .map(r =>
    [...r]
      .map(c => {
        if (c === '⌫')
          return `<button class="k sm" data-k="BS" type="button" aria-label="1文字消す">⌫</button>`;
        if (c === '␣')
          return `<button class="k sm" data-k="SP" type="button" aria-label="欄を切り替え">⇄</button>`;
        return `<button class="k" data-k="c${c}" type="button">${c}</button>`;
      })
      .join('')
  )
  .join('');

function press(k) {
  if (k[0] === 'c' && k.length === 2) {
    typeChar(k[1]);
    return;
  }
  switch (k) {
    case 'BS':
      bs();
      break;
    case 'LEFT':
      move(-1);
      break;
    case 'RIGHT':
      move(1);
      break;
    case 'SP':
      setField(actF === 'call' ? 'nr' : 'call');
      break;
    case 'ENTER':
      esm();
      break;
    case 'ESC':
      stopTx();
      break;
    case 'WIPE':
      wipe();
      break;
    case 'TU':
      if (running && F.call && F.nr) {
        logQso();
        transmit('TU');
        wipe();
      } else transmit('TU');
      break;
    default:
      transmit(k);
  }
}
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-k]');
  if (!b) return;
  e.preventDefault();
  press(b.dataset.k);
  try {
    navigator.vibrate && navigator.vibrate(6);
  } catch (_) {}
});
document.addEventListener('keydown', e => {
  if (e.target.closest('[data-k]') && (e.key === 'Enter' || e.key === ' ')) e.preventDefault();
  if (
    !$('sheet').hidden ||
    !$('resSheet').hidden ||
    !$('loginSheet').hidden ||
    !$('boardSheet').hidden ||
    !$('fbSheet').hidden
  )
    return;
  const k = e.key;
  const fm = { F1: 'CQ', F2: 'NR', F3: 'TU', F4: 'MY', F5: 'HIS', F6: 'B4', F7: 'Q', F8: 'AGN' };
  if (fm[k]) {
    e.preventDefault();
    press(fm[k]);
    return;
  }
  if (k === 'Enter') {
    e.preventDefault();
    esm();
    return;
  }
  if (k === 'Insert' || k === ';') {
    e.preventDefault();
    if (F.call) {
      transmit('EXCH');
      lastExchCall = F.call;
      setField('nr');
    }
    return;
  }
  if (k === 'Escape') {
    stopTx();
    return;
  }
  if (k === 'Backspace') {
    e.preventDefault();
    bs();
    return;
  }
  if (k === 'Delete') {
    e.preventDefault();
    del();
    return;
  }
  if (k === 'ArrowLeft') {
    e.preventDefault();
    move(-1);
    return;
  }
  if (k === 'ArrowRight') {
    e.preventDefault();
    move(1);
    return;
  }
  if (k === 'Home') {
    e.preventDefault();
    P[actF] = 0;
    renderFields();
    return;
  }
  if (k === 'End') {
    e.preventDefault();
    P[actF] = F[actF].length;
    renderFields();
    return;
  }
  if (k === ' ' || k === 'Tab') {
    e.preventDefault();
    press('SP');
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (/^[a-zA-Z0-9\/?]$/.test(k)) {
    e.preventDefault();
    typeChar(k.toUpperCase());
  }
});
$('fCall').addEventListener('pointerdown', e => tapField('call', e));
$('fNr').addEventListener('pointerdown', e => tapField('nr', e));
$('runBtn').addEventListener('click', () => (running ? stop(true, false) : start()));
$('resClose').addEventListener('click', () => ($('resSheet').hidden = true));

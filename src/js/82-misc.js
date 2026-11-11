let showPad = false;
try {
  showPad = localStorage.getItem('mrja-pad') === '1';
} catch (e) {}
function applyPad() {
  document.querySelector('.app').classList.toggle('showpad', showPad);
  $('padToggle').textContent = showPad ? '画面キーパッドを隠す' : '画面キーパッドを表示';
}
$('padToggle').addEventListener('click', () => {
  showPad = !showPad;
  try {
    localStorage.setItem('mrja-pad', showPad ? '1' : '0');
  } catch (e) {}
  applyPad();
});
applyPad();
function applyContest() {
  const c = running ? RUN.contest : S.contest;
  $('brandSub').textContent = 'JA CW RUNNER · ' + contestLabel(c);
  $('nrLabel').textContent = c === 'dx' ? 'NR (例 14)' : 'NR (例 13M)';
}
$('o_contest').addEventListener('change', () => {
  if (!running) applyContest();
  else toast('次の開始から反映されます');
});
applyContest();

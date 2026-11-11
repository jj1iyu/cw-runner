// ---------- 画面 ----------
const $ = id => document.getElementById(id);
const led = $('led'),
  logEl = $('log');
let toastT;
function toast(m) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = m;
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.hidden = true), 1400);
}
function clockStr() {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}
function setField(f, keepPos) {
  actF = f;
  if (!keepPos) P[f] = F[f].length;
  $('fCall').classList.toggle('act', f === 'call');
  $('fNr').classList.toggle('act', f === 'nr');
  renderFields();
}
function renderOne(f, el) {
  const v = F[f],
    p = Math.min(P[f], v.length);
  let h = '';
  for (let i = 0; i <= v.length; i++) {
    if (f === actF && i === p) h += '<i class="caret"></i>';
    if (i < v.length) h += `<span data-i="${i}">${esc(v[i])}</span>`;
  }
  el.innerHTML = h;
}
function renderFields() {
  renderOne('call', $('vCall'));
  renderOne('nr', $('vNr'));
}
function typeChar(c) {
  const max = actF === 'call' ? 14 : 8,
    v = F[actF];
  if (v.length >= max) return;
  const p = Math.min(P[actF], v.length);
  F[actF] = v.slice(0, p) + c + v.slice(p);
  P[actF] = p + 1;
  renderFields();
}
function bs() {
  const v = F[actF],
    p = Math.min(P[actF], v.length);
  if (!p) return;
  F[actF] = v.slice(0, p - 1) + v.slice(p);
  P[actF] = p - 1;
  renderFields();
}
function del() {
  const v = F[actF],
    p = P[actF];
  if (p >= v.length) return;
  F[actF] = v.slice(0, p) + v.slice(p + 1);
  renderFields();
}
function move(d) {
  P[actF] = Math.max(0, Math.min(F[actF].length, P[actF] + d));
  renderFields();
}
function tapField(f, e) {
  const sp = e.target.closest('span[data-i]');
  let p = F[f].length;
  if (sp) {
    const r = sp.getBoundingClientRect();
    p = +sp.dataset.i + (e.clientX > r.left + r.width / 2 ? 1 : 0);
  } else {
    const spans = [...document.querySelectorAll(`#${f === 'call' ? 'vCall' : 'vNr'} span[data-i]`)];
    if (spans.length && e.clientX < spans[0].getBoundingClientRect().left) p = 0;
  }
  P[f] = p;
  setField(f, true);
}
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
function renderLog() {
  if (!logArr.length) {
    logEl.innerHTML = `<div class="empty"><b>ENTER</b> でCQを出すと、各局が呼んできます。<br>コールを打って ENTER → 相手のナンバーを打って ENTER でQSO完了。<br>ナンバーはALL JAなら「13M」「1TM」、DXならCQゾーン「14」のように入力（カットナンバー可）。</div>`;
    return;
  }
  const lab = {
    ok: ['OK', 'ok'],
    bust: ['誤', 'ng'],
    nil: ['NIL', 'ng'],
    inc: ['未完', 'ng'],
    dup: ['DUP', 'ng']
  };
  logEl.innerHTML =
    '<div class="row head"><span>時刻</span><span>コール</span><span>NR</span><span style="text-align:right">判定</span></div>' +
    logArr
      .map(e => {
        const c =
          e.trueCall && !e.okC
            ? `<s>${esc(e.call)}</s><span class="fix">${esc(e.trueCall)}</span>`
            : esc(e.call);
        const n =
          e.trueNr && !e.okN
            ? `<s>${esc(e.nr || '—')}</s><span class="fix">${esc(e.trueNr)}</span>`
            : esc(e.nr);
        const [t, k] = lab[e.status];
        return `<div class="row"><span class="t">${e.t}</span><span>${c}</span><span>${n}</span><span class="mark ${k}">${t}</span></div>`;
      })
      .join('');
}
function calc() {
  const v = logArr.filter(e => e.status === 'ok');
  const mult = new Set(v.flatMap(e => e.mults || [])).size;
  const el = running ? (Date.now() - t0) / 1000 : RUN.elapsed || logArr[0]?.el || 0;
  const recent = v.filter(e => e.el > el - 600).length;
  const span = Math.min(600, Math.max(60, el));
  return {
    q: v.length,
    mult,
    score: v.length * mult,
    rate: Math.round((recent * 3600) / span),
    avg: el > 0 ? Math.round((v.length * 3600) / Math.max(60, el)) : 0,
    bust: logArr.filter(e => e.status === 'bust').length,
    nil: logArr.filter(e => e.status === 'nil' || e.status === 'inc').length,
    dup: logArr.filter(e => e.status === 'dup').length
  };
}
function updStats() {
  const c = calc();
  $('sQso').textContent = c.q;
  $('sMult').textContent = c.mult;
  $('sScore').textContent = c.score;
  $('sRate').textContent = c.rate;
  const dur = +(running ? RUN.dur : S.dur) * 60;
  if (!running) {
    $('sTime').textContent = dur ? fmt(dur) : '∞';
    return;
  }
  const el = (Date.now() - t0) / 1000;
  if (dur) {
    const left = dur - el;
    $('sTime').textContent = fmt(Math.max(0, left));
    if (left <= 0) stop(true, true);
  } else $('sTime').textContent = fmt(el);
}
const fmt = s => {
  s = Math.floor(s);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function qrmLoop() {
  if (!running || !S.qrm || Math.random() > 0.35) return;
  const s = makeStation();
  const sign = Math.random() < 0.5 ? -1 : 1;
  s.off = sign * R(S.bw * 0.25, S.bw * 0.6);
  s.amp = Math.pow(10, R(-26, -10) / 20);
  const other = makeStation();
  const msg = pick([
    `CQ TEST ${s.call} TEST`,
    `TU ${s.call}`,
    `${other.call} 5NN ${s.nrSent}`,
    `CQ TEST ${s.call}`
  ]);
  say(s, msg, R(0, 1.5));
}

async function start() {
  await audioOn();
  applyAudio();
  st = [];
  adr = null;
  worked = new Map();
  logArr = [];
  wipe();
  renderLog();
  RUN = { contest: S.contest, mode: S.mode, dur: S.dur, b4ok: 0 };
  applyContest();
  track('run_start', { contest: RUN.contest, mode: RUN.mode, dur: +RUN.dur, wpm: S.wpm, src: S.src });
  running = true;
  t0 = Date.now();
  $('runBtn').textContent = '停止';
  $('runBtn').classList.remove('primary');
  tick = setInterval(updStats, 250);
  qrmT = setInterval(qrmLoop, 4000);
  updStats();
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
  } catch (e) {}
  toast('ENTERでCQ');
}
function stop(showRes, finished) {
  if (running) RUN.elapsed = finished && +RUN.dur ? +RUN.dur * 60 : (Date.now() - t0) / 1000;
  running = false;
  clearInterval(tick);
  clearInterval(qrmT);
  stopTx();
  for (const s of st) if (s.tx) s.tx.stop();
  st = [];
  audioOff();
  $('runBtn').textContent = '開始';
  $('runBtn').classList.add('primary');
  try {
    wakeLock?.release();
  } catch (e) {}
  wakeLock = null;
  updStats();
  if (showRes && logArr.length) showResults(finished);
}

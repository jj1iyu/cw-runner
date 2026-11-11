// ---------- 運用ロジック ----------
let RUN = { contest: S.contest, mode: S.mode, dur: S.dur },
  running = false,
  t0 = 0,
  tick = null,
  qrmT = null,
  myTx = null,
  myTimer = null,
  lastExchCall = '',
  logArr = [],
  wakeLock = null;
const F = { call: '', nr: '' };
const P = { call: 0, nr: 0 };
let actF = 'call';

const pending = () => st.filter(s => s.state === 'calling');
const live = () => st.filter(s => s.state !== 'gone' && s.state !== 'done');
function callAgain(prob) {
  for (const s of pending()) {
    if (Math.random() >= prob) continue;
    if (--s.patience < 0) {
      s.state = 'gone';
      continue;
    }
    say(s, callMsg(s), R(0.1, 1.3));
  }
}
function spawn(n) {
  const cap = S.act + 2;
  for (let i = 0; i < n && pending().length < cap; i++) {
    const s = makeStation();
    st.push(s);
    say(s, callMsg(s), R(0.1, 1.4));
  }
}

function compose(type) {
  const my = S.myCall.toUpperCase(),
    nr0 = (RUN.contest === 'dx' ? S.myZone : S.myNr).toUpperCase(),
    myNr = S.cutMe ? cut(nr0) : nr0,
    rst = S.cutMe ? '5NN' : '599';
  switch (type) {
    case 'CQ':
      return S.cq.toUpperCase().replace(/\{MY\}/g, my);
    case 'EXCH':
      return `${F.call} ${rst} ${myNr}`;
    case 'NR':
      return `${rst} ${myNr}`;
    case 'TU':
      return S.tu.toUpperCase().replace(/\{MY\}/g, my);
    case 'MY':
      return my;
    case 'HIS':
      return F.call;
    case 'B4':
      return 'QSO B4';
    case 'Q':
      return '?';
    case 'AGN':
      return 'NR?';
  }
}
// 送信中に押したメッセージは順番待ちにして、今の送信が終わったら続けて送る
let txQueue = [],
  txBatch = [];
function transmit(type) {
  if (!running) {
    toast('「開始」を押してください');
    return;
  }
  if ((type === 'HIS' || type === 'EXCH') && !F.call) {
    toast('CALLが空です');
    return;
  }
  const text = compose(type);
  if (!text) return;
  const item = { type, text, info: { call: F.call } };
  if (myTx) {
    if (txQueue.length < 6) txQueue.push(item);
    showLed();
    return;
  }
  for (const s of st) if (s.tx) s.tx.stop();
  sendItem(item, 0.04);
}
// 送信中は受信音（ノイズ・相手局・QRM）をミュートし、自局のモニター音だけにする
function rxMute(on) {
  if (!ctx || !rx) return;
  const g = rx.gain,
    t = ctx.currentTime;
  try {
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(on ? 0 : 1, t + 0.006);
  } catch (e) {
    g.value = on ? 0 : 1;
  }
}
function sendItem(item, gap) {
  rxMute(true);
  myTx = play(item.text, { freq: S.pitch, amp: 0.5, wpm: S.wpm, t0: ctx.currentTime + gap, dest: mon });
  txBatch.push(item);
  showLed();
  myTimer = setTimeout(onTxEnd, (myTx.end - ctx.currentTime) * 1000 + 30);
}
function onTxEnd() {
  myTx = null;
  if (txQueue.length) {
    sendItem(txQueue.shift(), (7 * 1.2) / S.wpm);
    return;
  }
  rxMute(false);
  const batch = txBatch;
  txBatch = [];
  showLed();
  for (const it of batch) onSent(it.type, it.info);
}
function showLed() {
  led.classList.toggle('on', !!myTx);
  led.textContent = txQueue.length ? `TX+${txQueue.length}` : 'TX';
}
function stopTx() {
  if (myTx) {
    myTx.stop();
    myTx = null;
  }
  clearTimeout(myTimer);
  txQueue = [];
  txBatch = [];
  rxMute(false);
  showLed();
}

function onSent(type, info) {
  if (!running) return;
  st = st.filter(s => s.state !== 'gone' && s.state !== 'done');
  const single = RUN.mode === 'single';
  switch (type) {
    case 'CQ':
    case 'MY':
      adr = null;
      callAgain(0.9);
      if (type === 'CQ') {
        if (single) {
          if (!pending().length && Math.random() < 0.9) spawn(1);
        } else {
          let n = poisson(S.act * 0.5);
          if (!pending().length && n === 0 && Math.random() < 0.7) n = 1;
          spawn(n);
        }
      }
      break;
    case 'EXCH':
    case 'HIS': {
      const c = info.call,
        exact = live().find(s => s.call === c);
      if (exact) {
        adr = exact;
        if (type === 'EXCH') {
          if (exact.agn > 0 && exact.state !== 'exch') {
            exact.agn--;
            exact.state = 'asked';
            say(exact, Math.random() < 0.5 ? 'NR?' : 'AGN', R(0.15, 0.5));
          } else {
            exact.state = 'exch';
            say(
              exact,
              exact.state === 'exch' && exact._sent ? `${exact.nrSent} ${exact.nrSent}` : exchMsg(exact),
              R(0.15, 0.5)
            );
            exact._sent = true;
          }
        } else {
          if (exact.state === 'calling') exact.state = 'answered';
          say(exact, 'R', R(0.15, 0.4));
        }
      } else {
        adr = null;
        const cand = live().filter(s => matches(c, s.call));
        if (cand.length) {
          for (const s of cand) {
            if (s.state !== 'calling') s.state = 'calling';
            say(s, Math.random() < 0.4 ? `DE ${s.call}` : s.call, R(0.15, 0.8));
          }
        } else callAgain(0.3);
      }
      break;
    }
    case 'NR':
      if (adr && adr.state !== 'gone' && adr.state !== 'done') {
        if (adr.agn > 0 && adr.state !== 'exch') {
          adr.agn--;
          adr.state = 'asked';
          say(adr, 'NR?', R(0.15, 0.5));
        } else {
          adr.state = 'exch';
          say(adr, adr._sent ? `${adr.nrSent} ${adr.nrSent}` : exchMsg(adr), R(0.15, 0.5));
          adr._sent = true;
        }
      } else callAgain(0.5);
      break;
    case 'Q':
    case 'AGN':
      if (adr && adr.state === 'exch') say(adr, `${adr.nrSent} ${adr.nrSent}`, R(0.15, 0.5));
      else if (adr && (adr.state === 'asked' || adr.state === 'answered'))
        say(adr, adr.state === 'asked' ? 'NR?' : adr.call, R(0.15, 0.5));
      else callAgain(0.9);
      break;
    case 'B4':
      if (adr) {
        if (adr.dupe) RUN.b4ok = (RUN.b4ok || 0) + 1;
        adr.state = 'gone';
        adr = null;
      }
      callAgain(0.8);
      break;
    case 'TU':
      adr = null;
      if (single) {
        if (!pending().length && Math.random() < 0.85) spawn(1);
      } else {
        callAgain(0.8);
        spawn(poisson(S.act * 0.25));
      }
      break;
  }
}

function logQso() {
  const call = F.call,
    nr = F.nr;
  let s = adr && adr.state !== 'gone' && adr.state !== 'done' ? adr : null;
  if (!s) {
    const c = live().filter(x => matches(call, x.call));
    s = c.sort((a, b) => lev(call, a.call) - lev(call, b.call))[0] || null;
  }
  const e = { t: clockStr(), call, nr, status: 'nil' };
  if (s) {
    e.trueCall = s.call;
    e.trueNr = s.nr;
    e.mults = s.mults;
    e.pref = s.pref;
    e.pw = s.pw;
    e.area = s.area;
    e.cont = s.cont;
    const okC = call === s.call,
      okN = normNr(nr) === normNr(s.nr);
    if (s.state !== 'exch') e.status = 'inc';
    else if (s.dupe || worked.has(s.call)) e.status = 'dup';
    else e.status = okC && okN ? 'ok' : 'bust';
    e.okC = okC;
    e.okN = okN;
    s.state = 'done';
    if (e.status === 'ok' || e.status === 'bust')
      worked.set(s.call, {
        call: s.call,
        nr: s.nr,
        mults: s.mults,
        pref: s.pref,
        pw: s.pw,
        area: s.area,
        cont: s.cont,
        ent: s.ent
      });
  }
  e.el = (Date.now() - t0) / 1000;
  logArr.unshift(e);
  renderLog();
  updStats();
}

function esm() {
  if (!running) {
    toast('「開始」を押してください');
    return;
  }
  if (!F.call) {
    transmit('CQ');
    return;
  }
  if (F.call.includes('?')) {
    transmit('HIS');
    return;
  }
  if (!F.nr || F.call !== lastExchCall) {
    transmit('EXCH');
    lastExchCall = F.call;
    setField('nr');
    return;
  }
  logQso();
  transmit('TU');
  wipe();
}
function wipe() {
  F.call = '';
  F.nr = '';
  P.call = P.nr = 0;
  lastExchCall = '';
  setField('call');
}

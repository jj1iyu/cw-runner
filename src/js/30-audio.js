// ---------- 音声 ----------
let ctx, master, rx, f1, f2, mon, noiseG, qrnG;
// iPhoneのマナーモードでも鳴らすため、音声の種類を「再生」にする（対応していない古いiOSは無音の音声で切り替える）
let silentEl = null;
const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA';
function playbackMode(on) {
  try {
    if (navigator.audioSession) {
      navigator.audioSession.type = on ? 'playback' : 'auto';
      return;
    }
  } catch (e) {}
  try {
    if (
      !/iPhone|iPad|iPod/.test(navigator.userAgent) &&
      !(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    )
      return;
    if (!silentEl) {
      silentEl = document.createElement('audio');
      silentEl.src = SILENT_WAV;
      silentEl.loop = true;
      silentEl.setAttribute('playsinline', '');
      silentEl.setAttribute('x-webkit-airplay', 'deny');
      silentEl.preload = 'auto';
    }
    if (on) silentEl.play().catch(() => {});
    else silentEl.pause();
  } catch (e) {}
}
async function audioOn() {
  playbackMode(true);
  initAudio();
  if (ctx.state !== 'running') {
    try {
      await ctx.resume();
    } catch (e) {}
  }
}
function audioOff() {
  if (ctx && ctx.state === 'running') {
    try {
      ctx.suspend();
    } catch (e) {}
  }
  playbackMode(false);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) audioOff();
  else if (running) audioOn();
});
addEventListener('pagehide', audioOff);

function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -10;
  comp.ratio.value = 8;
  master.connect(comp);
  comp.connect(ctx.destination);
  rx = ctx.createGain();
  f1 = ctx.createBiquadFilter();
  f2 = ctx.createBiquadFilter();
  f1.type = f2.type = 'bandpass';
  const mk = ctx.createGain();
  mk.gain.value = 2.2;
  rx.connect(f1);
  f1.connect(f2);
  f2.connect(mk);
  mk.connect(master);
  mon = ctx.createGain();
  mon.connect(master);
  // 白色雑音
  const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate),
    d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const ns = ctx.createBufferSource();
  ns.buffer = nb;
  ns.loop = true;
  noiseG = ctx.createGain();
  ns.connect(noiseG);
  noiseG.connect(rx);
  ns.start();
  // 空電
  const qb = ctx.createBuffer(1, ctx.sampleRate * 5, ctx.sampleRate),
    q = qb.getChannelData(0);
  for (let k = 0; k < 40; k++) {
    let p = Math.floor(Math.random() * q.length),
      a = R(0.3, 1.6),
      len = RI(200, 3000);
    for (let i = 0; i < len && p + i < q.length; i++)
      q[p + i] += (Math.random() * 2 - 1) * a * Math.exp(-i / (len / 4));
  }
  const qs = ctx.createBufferSource();
  qs.buffer = qb;
  qs.loop = true;
  qrnG = ctx.createGain();
  qs.connect(qrnG);
  qrnG.connect(rx);
  qs.start();
  applyAudio();
}
function applyAudio() {
  if (!ctx) return;
  master.gain.value = S.vol;
  mon.gain.value = S.mon * 0.6;
  for (const f of [f1, f2]) {
    f.frequency.value = S.pitch;
    f.Q.value = S.pitch / S.bw;
  }
  qrnG.gain.value = S.qrn ? 1 : 0;
  noiseG.gain.value = S.noise;
}
function keying(text, wpm) {
  const u = 1.2 / wpm,
    segs = [];
  let t = 0;
  const words = text.trim().toUpperCase().split(/\s+/);
  words.forEach((w, wi) => {
    const chars = [...w].filter(c => M[c]);
    chars.forEach((c, ci) => {
      const code = M[c];
      for (let k = 0; k < code.length; k++) {
        const dur = code[k] === '.' ? u : 3 * u;
        segs.push([t, dur]);
        t += dur;
        if (k < code.length - 1) t += u;
      }
      if (ci < chars.length - 1) t += 3 * u;
    });
    if (wi < words.length - 1) t += 7 * u;
  });
  return { segs, len: t };
}
function play(text, o) {
  const k = keying(text, o.wpm),
    t0 = o.t0;
  const osc = ctx.createOscillator();
  osc.frequency.value = o.freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  osc.connect(g);
  const nodes = [osc];
  let out = g;
  if (o.qsb || o.flutter) {
    const q = ctx.createGain();
    g.connect(q);
    out = q;
    if (o.qsb) {
      let v = R(0.4, 1);
      q.gain.setValueAtTime(v, t0);
      for (let t = 0.35; t < k.len + 0.4; t += 0.35) {
        v = Math.min(1, Math.max(0.2, v + (Math.random() - 0.5) * 0.6));
        q.gain.linearRampToValueAtTime(v, t0 + t);
      }
    } else q.gain.value = 0.7;
    if (o.flutter) {
      const l = ctx.createOscillator(),
        lg = ctx.createGain();
      l.frequency.value = R(8, 18);
      lg.gain.value = 0.5;
      l.connect(lg);
      lg.connect(q.gain);
      l.start(t0);
      l.stop(t0 + k.len + 0.1);
      nodes.push(l);
    }
  }
  out.connect(o.dest);
  const ra = 0.005;
  for (const [s, d] of k.segs) {
    g.gain.setValueAtTime(0, t0 + s);
    g.gain.linearRampToValueAtTime(o.amp, t0 + s + ra);
    g.gain.setValueAtTime(o.amp, t0 + s + d);
    g.gain.linearRampToValueAtTime(0, t0 + s + d + ra);
  }
  osc.start(t0);
  osc.stop(t0 + k.len + 0.05);
  return {
    end: t0 + k.len,
    stop() {
      for (const n of nodes) {
        try {
          n.stop();
        } catch (e) {}
      }
    }
  };
}
function say(s, text, delay) {
  if (s.tx) s.tx.stop();
  s.tx = play(text, {
    freq: S.pitch + s.off,
    amp: s.amp * S.sigP * 3,
    wpm: s.wpm,
    t0: ctx.currentTime + delay,
    dest: rx,
    qsb: S.qsb && s.fades,
    flutter: S.flutter && s.flut
  });
}

// ---------- 局の生成 ----------
let st = [],
  adr = null,
  worked = new Map();
function genCall(area) {
  const usePfx1 = area === '1' && Math.random() < 0.12;
  const p = usePfx1 ? pick(PFX1) : pick(PFX);
  const n = p === 'JA' && Math.random() < 0.3 ? 2 : 3;
  let s = '';
  for (let i = 0; i < n; i++) s += pick(LET);
  return p + area + s;
}
function makeStation() {
  let s;
  if (worked.size && Math.random() < 0.03) {
    const w = pick([...worked.values()]);
    s = { ...w, dupe: true };
  } else if (RUN.contest === 'dx') {
    const real = useReal() && DX_REST.length;
    let g,
      tries = 0;
    do {
      g = real ? { ...pick(Math.random() < 0.35 && DX_NA.length ? DX_NA : DX_REST) } : genDX();
      tries++;
    } while (tries < 20 && (worked.has(g.call) || st.some(x => x.call === g.call)));
    if (!g.cont) g.cont = zoneCont(g.zone);
    s = {
      call: g.call,
      nr: (g.zone < 10 && Math.random() < 0.3 ? '0' : '') + g.zone,
      mults: ['Z' + g.zone, 'E' + g.ent],
      cont: g.cont,
      ent: g.ent
    };
  } else if (useReal() && JA_REAL.length) {
    let r,
      tries = 0;
    do {
      r = pick(JA_REAL);
      tries++;
    } while (tries < 20 && (worked.has(r[0]) || st.some(x => x.call === r[0])));
    const m = r[1].match(/^(\d+)([HMLP])$/),
      num = +m[1];
    s = { call: r[0], nr: pad2(num) + m[2], mults: ['P' + num], pref: num, pw: m[2], area: callArea(r[0]) };
  } else {
    let tries = 0,
      call,
      area,
      opArea;
    do {
      area = pickW(AREA_W);
      call = genCall(area);
      opArea = area;
      if (Math.random() < 0.06) {
        opArea = pickW(AREA_W);
        if (opArea !== area) call += '/' + opArea;
      }
      tries++;
    } while (tries < 20 && (worked.has(call) || st.some(x => x.call === call)));
    const pr = pick(AREAS[opArea]);
    const pw = pickW(PWR);
    s = { call, nr: pad2(pr[0]) + pw, mults: ['P' + pr[0]], pref: pr[0], pw, area: opArea };
  }
  const cutUse = Math.random() < 0.55;
  Object.assign(s, {
    rst: Math.random() < 0.99 ? '5NN' : '599',
    cut: cutUse,
    nrSent: cutUse ? cut(s.nr, Math.random() < 0.15) : s.nr,
    wpm: Math.max(12, Math.min(50, S.wpm + (S.wpmVar ? RI(-7, 4) : 0))),
    off: (Math.random() * 2 - 1) * S.bw * 0.38,
    amp: Math.pow(10, R(-16, -3) / 20),
    fades: Math.random() < 0.6,
    flut: Math.random() < 0.25,
    patience: RI(2, 5),
    agn: Math.random() < (S.qsb ? 0.12 : 0.06) ? 1 : 0,
    state: 'calling',
    tx: null
  });
  return s;
}
const callMsg = s => (Math.random() < 0.15 ? `${s.call} ${s.call}` : s.call);
function exchMsg(s) {
  const rst = s.rst || '5NN',
    r = Math.random();
  return r < 0.5
    ? `${rst} ${s.nrSent}`
    : r < 0.75
      ? `TU ${rst} ${s.nrSent}`
      : r < 0.9
        ? `R ${rst} ${s.nrSent}`
        : `${rst} ${s.nrSent} ${s.nrSent}`;
}

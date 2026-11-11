const R = (a, b) => a + Math.random() * (b - a);
const RI = (a, b) => Math.floor(R(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const pickW = o => {
  let t = 0;
  for (const k in o) t += o[k];
  let r = Math.random() * t;
  for (const k in o) {
    r -= o[k];
    if (r < 0) return k;
  }
  return Object.keys(o)[0];
};
const poisson = l => {
  let L = Math.exp(-l),
    k = 0,
    p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
};
const pad2 = n => (n < 100 ? String(n).padStart(2, '0') : String(n));
const cut = (s, a = false) =>
  s
    .replace(/0/g, 'T')
    .replace(/9/g, 'N')
    .replace(/1/g, c => (a ? 'A' : c));
function lev(a, b) {
  const d = [];
  for (let i = 0; i <= a.length; i++) {
    d[i] = [i];
    for (let j = 1; j <= b.length; j++)
      d[i][j] = i
        ? Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
        : j;
  }
  return d[a.length][b.length];
}
function normNr(x) {
  x = (x || '').toUpperCase().replace(/\s+/g, '');
  x = x.replace(/^(599|5NN)(?=.+)/, '');
  const m = x.match(/^([0-9TNAO]+)([HMLP]?)$/);
  if (!m) return x;
  return String(Number(m[1].replace(/[TO]/g, '0').replace(/N/g, '9').replace(/A/g, '1'))) + m[2];
}

function matches(sent, call) {
  if (sent.includes('?')) {
    const re = new RegExp(sent.replace(/[.*+^${}()|[\]\\]/g, '\\$&').replace(/\?/g, '.'));
    return re.test(call);
  }
  if (sent.length >= 2 && call.includes(sent)) return true;
  return lev(sent, call) <= Math.max(1, Math.floor(call.length / 3));
}

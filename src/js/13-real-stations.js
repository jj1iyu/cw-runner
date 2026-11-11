// ---------- 実在局データ ----------
const CD = window.CWR_DATA || null;
const JA_REAL = CD
  ? CD.ja
      .split(';')
      .map(x => x.split(','))
      .filter(x => /^\d{1,3}[HMLP]$/.test(x[1] || ''))
  : [];
const DX_NA = [],
  DX_REST = [];
if (CD)
  for (const r of CD.dx.split(';')) {
    const [c, z, e] = r.split(',');
    const o = { call: c, zone: +z, ent: CD.dxEnts[+e], cont: CD.dxCont[+e] };
    (/America|Canada/.test(o.ent) ? DX_NA : DX_REST).push(o);
  }
const useReal = () => S.src !== 'random';
const zoneCont = z =>
  z <= 8
    ? 'NA'
    : z <= 13
      ? 'SA'
      : z <= 16 || z === 20
        ? 'EU'
        : z <= 27
          ? 'AS'
          : z <= 32
            ? 'OC'
            : z <= 39
              ? 'AF'
              : 'EU';
const callArea = c => {
  const m = c.match(/\/(\d)$/);
  if (m) return m[1];
  const d = c.match(/^(?:7[J-N]|8[J-N]|[A-Z]{2})(\d)/);
  return d ? d[1] : null;
};

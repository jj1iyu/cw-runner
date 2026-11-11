// ---------- 設定 ----------
const DEF = {
  src: 'real',
  myCall: 'JA1ZZZ',
  myNr: '10H',
  myZone: '25',
  contest: 'ja',
  cq: 'CQ TEST {MY} TEST',
  tu: 'TU',
  cutMe: true,
  mode: 'single',
  dur: '5',
  act: 4,
  wpm: 24,
  wpmVar: true,
  pitch: 600,
  bw: 400,
  vol: 0.7,
  mon: 0.35,
  qsb: false,
  qrm: false,
  sigP: 0.5,
  noise: 0.05,
  qrn: false,
  flutter: false
};
let S = { ...DEF };
try {
  const j = JSON.parse(localStorage.getItem('mrja') || 'null');
  if (j) S = { ...DEF, ...j };
} catch (e) {}
const save = () => {
  try {
    localStorage.setItem('mrja', JSON.stringify(S));
  } catch (e) {}
};

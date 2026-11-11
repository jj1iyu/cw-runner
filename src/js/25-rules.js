// ---------- 決まりごと（画面に依存しない計算。tests/unit で検査） ----------
// ランキングのカテゴリと上限
const keyOf = (c, m, d) => (c === 'dx' ? `dx-${m}-${d}` : `${m}-${d}`);
const QMAX = { 5: 34, 10: 67, 30: 200, 60: 400 }; // 1時間400局のペース
const MMAX = { ja: 60, dx: 200 }; // ALL JA：都府県46＋北海道14振興局、DX：ゾーン40＋エンティティ
const capOf = key => {
  const m = key.match(/^(dx-)?(pile|single)-(5|10|30|60)$/);
  return m ? { q: QMAX[m[3]], m: MMAX[m[1] ? 'dx' : 'ja'] } : null;
};
const validRun = (key, r) => {
  const c = capOf(key);
  return (
    !!c &&
    r &&
    [r.score, r.q, r.mult].every(Number.isInteger) &&
    r.q >= 0 &&
    r.q <= c.q &&
    r.mult >= 0 &&
    r.mult <= c.m &&
    r.score === r.q * r.mult
  );
};
// 表示名
const modeLabel = m => (m === 'single' ? 'シングルコール' : 'パイルアップ');
const durLabel = d => d + '分';
const contestLabel = c => (c === 'dx' ? 'DX' : 'ALL JA');
// 練習量：日付は日本時間で数える
const jstDay = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
const jstMonth = (t = Date.now()) => jstDay(t).slice(0, 7);
const DAY_MAX = 30; // 1日に数える完走回数の上限
function practiceOf(d) {
  const today = jstDay(),
    yest = jstDay(Date.now() - 86400e3),
    month = jstMonth();
  const monthPlays = d && d.month === month ? d.monthPlays | 0 : 0;
  const streak = d && (d.lastDay === today || d.lastDay === yest) ? d.streak | 0 : 0;
  return { plays: (d && d.plays) | 0, monthPlays, streak };
}
// 保存する1行分の形をそろえる（足りない項目は初期値）
function docOf(d, patch) {
  const runs = {};
  for (const [k, v] of Object.entries((d && d.runs) || {})) if (validRun(k, v)) runs[k] = v;
  const base = {
    call: String((d && d.call) || S.myCall).slice(0, 12),
    runs,
    plays: (d && d.plays) | 0,
    updatedAt: (d && d.updatedAt) | 0,
    month: d && typeof d.month === 'string' && d.month.length === 7 ? d.month : jstMonth(),
    monthPlays: (d && d.monthPlays) | 0,
    lastDay: d && typeof d.lastDay === 'string' && d.lastDay.length === 10 ? d.lastDay : '0000-00-00',
    dayPlays: (d && d.dayPlays) | 0,
    streak: (d && d.streak) | 0
  };
  if (!(d && typeof d.month === 'string' && d.month.length === 7)) base.monthPlays = 0;
  if (!(d && typeof d.lastDay === 'string' && d.lastDay.length === 10)) base.dayPlays = 0;
  return { ...base, ...(patch || {}) };
}
// 完走1回分を数えた新しい値（1日の上限を超えたら数えない）
function countRun(d) {
  const now = Date.now(),
    today = jstDay(now),
    yest = jstDay(now - 86400e3),
    month = jstMonth(now);
  const b = docOf(d);
  const sameDay = b.lastDay === today;
  if (sameDay && b.dayPlays >= DAY_MAX) return { doc: b, counted: false };
  return {
    counted: true,
    doc: {
      ...b,
      plays: b.plays + 1,
      updatedAt: now,
      month,
      monthPlays: (b.month === month ? b.monthPlays : 0) + 1,
      lastDay: today,
      dayPlays: (sameDay ? b.dayPlays : 0) + 1,
      streak: sameDay ? Math.max(1, b.streak) : b.lastDay === yest ? b.streak + 1 : 1
    }
  };
}
// 称号：実力値 = 平均レート × 正確さ
const TIERS = [
  [0, 'SWL'],
  [30, 'ビギナー'],
  [60, 'ルーキー'],
  [100, 'コンテスター'],
  [150, 'ランナー'],
  [200, 'パイル職人'],
  [260, 'エース'],
  [330, 'マスター'],
  [420, 'レジェンド']
];
const tierOf = p => {
  let i = 0;
  for (let k = 0; k < TIERS.length; k++) if (p >= TIERS[k][0]) i = k;
  return i;
};
// コールサインの形
const validCall = c => /^[A-Z0-9]{1,3}[0-9][A-Z0-9]*[A-Z](\/[A-Z0-9]+)?$/.test(c) && c.length <= 12;

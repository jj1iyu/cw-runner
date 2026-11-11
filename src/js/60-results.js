// ---------- 結果画面・称号・実績 ----------
const ACH = [
  ['first', 'ファーストQSO', '初めてQSOを完了', r => r.q >= 1],
  ['q25', '25 QSO', '1回で25局', r => r.q >= 25],
  ['q50', '50 QSO', '1回で50局', r => r.q >= 50],
  ['q100', '100 QSO', '1回で100局', r => r.q >= 100],
  ['clean', 'パーフェクト', '10局以上でミスなし', r => r.q >= 10 && r.miss === 0],
  ['st20', '20連続正解', '20局続けてミスなし', r => r.streak >= 20],
  ['st50', '50連続正解', '50局続けてミスなし', r => r.streak >= 50],
  ['r150', 'レート150', '5分以上走って平均150局/h', r => r.el >= 300 && r.avg >= 150],
  ['r250', 'レート250', '5分以上走って平均250局/h', r => r.el >= 300 && r.avg >= 250],
  ['m20', 'マルチ20', '1回でマルチ20', r => r.mult >= 20],
  ['m40', 'マルチ40', '1回でマルチ40', r => r.mult >= 40],
  ['areas', '全エリア制覇', 'ALL JAで0〜9エリアすべてと交信', r => r.areas >= 10],
  ['hokkaido', '北の大地', '北海道の振興局を3つ', r => r.hok >= 3],
  ['qrp', 'QRPハンター', 'QRP（P）局を5局', r => r.qrp >= 5],
  ['dx1', 'DXデビュー', 'DXモードで初QSO', r => r.contest === 'dx' && r.q >= 1],
  ['cont6', '6大陸', 'DXで6大陸すべてと交信', r => r.conts >= 6],
  ['b4', 'B4を見抜いた', 'DUP局にB4を返した', r => r.b4 >= 1],
  ['full60', '60分完走', '60分コンテストを最後まで', r => r.finished && +r.dur === 60],
  ['night', '夜更かし', '0時〜4時に完走', r => r.finished && new Date().getHours() < 4],
  ['d3', '3日連続', '3日続けて練習', r => r.days >= 3],
  ['d7', '7日連続', '7日続けて練習', r => r.days >= 7]
];
const STAR =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.5 7.1.7-5.3 4.8 1.5 7-6.2-3.6-6.2 3.6 1.5-7L2 9.2l7.1-.7z"/></svg>';
const ls = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  }
};
function dayStreak() {
  const today = new Date();
  const key = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const st = ls.get('mrja-days', { last: '', n: 0 });
  const t = key(today);
  if (st.last === t) return st.n;
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  const n = st.last === key(y) ? st.n + 1 : 1;
  ls.set('mrja-days', { last: t, n });
  return n;
}
function chip(a, cls) {
  return `<span class="chip ${cls || ''}">${STAR}<span>${a[1]}<small>${a[2]}</small></span></span>`;
}
function countUp(el, to) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || to <= 0) {
    el.textContent = to;
    return;
  }
  const t0 = performance.now(),
    d = 900;
  const f = t => {
    const k = Math.min(1, (t - t0) / d);
    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
}
function drawGraph(el) {
  const v = logArr.filter(e => e.status === 'ok');
  const mins = Math.max(1, Math.ceil((RUN.elapsed || 60) / 60));
  const b = new Array(mins).fill(0);
  for (const e of v) b[Math.min(mins - 1, Math.floor(e.el / 60))]++;
  const mx = Math.max(1, ...b),
    w = 300 / mins;
  $('rGraph').innerHTML =
    b
      .map((n, i) => {
        const h = (n / mx) * 56;
        return `<rect x="${(i * w + w * 0.12).toFixed(1)}" y="${(60 - h).toFixed(1)}" width="${(w * 0.76).toFixed(1)}" height="${Math.max(h, 1).toFixed(1)}" rx="1.5" fill="${n === mx ? 'var(--acc)' : 'var(--acc-dim)'}"/>`;
      })
      .join('') + `<line x1="0" y1="60.5" x2="300" y2="60.5" stroke="var(--line)"/>`;
}
let lastShare = '';
function showResults(finished) {
  const c = calc(),
    v = logArr.filter(e => e.status === 'ok');
  const miss = logArr.length - v.length,
    acc = logArr.length ? v.length / logArr.length : 0;
  let streak = 0,
    run = 0;
  for (const e of [...logArr].reverse()) {
    if (e.status === 'ok') {
      run++;
      streak = Math.max(streak, run);
    } else run = 0;
  }
  const days = finished || c.q ? dayStreak() : ls.get('mrja-days', { n: 0 }).n;
  const r = {
    ...c,
    miss,
    acc,
    streak,
    el: RUN.elapsed || 0,
    contest: RUN.contest,
    dur: RUN.dur,
    finished: !!finished,
    b4: RUN.b4ok || 0,
    days,
    areas: new Set(v.map(e => e.area).filter(Boolean)).size,
    hok: new Set(v.filter(e => e.pref > 100).map(e => e.pref)).size,
    qrp: v.filter(e => e.pw === 'P').length,
    conts: new Set(v.map(e => e.cont).filter(Boolean)).size
  };
  const key = keyOf(RUN.contest, RUN.mode, RUN.dur),
    timed = finished && +RUN.dur && c.q > 0;
  const cat = `${contestLabel(RUN.contest)} · ${+RUN.dur ? RUN.dur + '分' : '無制限'} · ${modeLabel(RUN.mode)}`;
  $('rCat').textContent = cat.toUpperCase();
  // 称号：実力値 = 平均レート × 正確さ
  const power = Math.round(c.avg * acc),
    ti = tierOf(power),
    bestTier = ls.get('mrja-tier', 0);
  $('rTier').textContent = TIERS[ti][1];
  $('rTierUp').hidden = !(timed && ti > bestTier);
  if (timed && ti > bestTier) ls.set('mrja-tier', ti);
  const nx = TIERS[ti + 1];
  $('rNext').textContent = nx
    ? `次の称号「${nx[1]}」まで 実力値 あと ${nx[0] - power}（今回 ${power}＝平均レート×正確さ）`
    : `最高の称号です（実力値 ${power}）`;
  const lo = TIERS[ti][0],
    hi = nx ? nx[0] : lo + 100;
  $('rBar').style.width = '0';
  requestAnimationFrame(() =>
    requestAnimationFrame(
      () => ($('rBar').style.width = Math.min(100, ((power - lo) / (hi - lo)) * 100) + '%')
    )
  );
  // 自己ベスト
  const prev = ls.get('mrja-best', {})[key];
  const pb = $('rPB');
  pb.className = 'pb';
  if (!c.q) pb.textContent = 'まずは1局から。ENTERでCQ！';
  else if (!timed) pb.textContent = '途中で停止した回・無制限は記録に残りません';
  else if (!prev) {
    pb.textContent = '初記録！';
    pb.classList.add('up');
  } else if (c.score > prev.score) {
    pb.textContent = `自己ベスト更新！ +${c.score - prev.score}点`;
    pb.classList.add('up');
  } else pb.textContent = `自己ベストまで あと ${prev.score - c.score + 1}点（ベスト ${prev.score}点）`;
  countUp($('rScore'), c.score);
  $('rQso').textContent = c.q;
  $('rMult').textContent = c.mult;
  $('rRate').textContent = c.avg;
  $('rAcc').textContent = Math.round(acc * 100) + '%';
  $('rStreak').textContent = streak;
  $('rMiss').textContent = miss;
  drawGraph();
  // 実績
  const got = ls.get('mrja-ach', {}),
    fresh = [];
  for (const a of ACH)
    if (!got[a[0]] && a[3](r)) {
      got[a[0]] = Date.now();
      fresh.push(a);
    }
  ls.set('mrja-ach', got);
  $('rNew').hidden = !fresh.length;
  $('rNewList').innerHTML = fresh.map(a => chip(a, 'new')).join('');
  $('rAchSum').textContent = `実績 ${Object.keys(got).length} / ${ACH.length}（一覧を見る）`;
  $('rAchAll').innerHTML = ACH.map(a => chip(a, got[a[0]] ? '' : 'locked')).join('');
  $('rDays').innerHTML = days >= 2 ? `<b>${days}日連続</b>で練習中` : '';
  lastShare = `JA CW Runner ${contestLabel(RUN.contest)} ${+RUN.dur ? RUN.dur + '分' : ''} ${modeLabel(RUN.mode)}\n${S.myCall}: ${c.score}点（${c.q}QSO × ${c.mult}マルチ）正確さ${Math.round(acc * 100)}%\n称号「${TIERS[ti][1]}」${fresh.length ? ' / 新実績 ' + fresh.map(a => a[1]).join('・') : ''}`;
  $('rBoard').textContent = timed ? 'ランキングに記録しています…' : '';
  $('resSheet').hidden = false;
  $('resSheet').scrollTop = 0;
  track('run_end', {
    contest: RUN.contest,
    mode: RUN.mode,
    dur: +RUN.dur,
    finished: finished ? 1 : 0,
    score: c.score,
    qso: c.q,
    acc: Math.round(acc * 100),
    tier: TIERS[ti][1]
  });
  if (timed)
    submitScore(c).then(t => {
      $('rBoard').textContent = t;
      lastShare += '\n' + t.split('\n')[0];
    });
}
$('resAgain').addEventListener('click', () => {
  $('resSheet').hidden = true;
  start();
});
$('resShare').addEventListener('click', () => {
  const done = () => toast('結果をコピーしました');
  try {
    navigator.clipboard.writeText(lastShare).then(done, () => fallbackCopy());
  } catch (e) {
    fallbackCopy();
  }
  function fallbackCopy() {
    const t = document.createElement('textarea');
    t.value = lastShare;
    document.body.appendChild(t);
    t.select();
    try {
      document.execCommand('copy');
      done();
    } catch (e) {
      toast('コピーできませんでした');
    }
    t.remove();
  }
});

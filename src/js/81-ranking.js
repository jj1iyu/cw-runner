async function submitScore(c) {
  const key = keyOf(RUN.contest, RUN.mode, RUN.dur);
  const entry = { score: c.score, q: c.q, mult: c.mult, rate: c.avg, wpm: S.wpm, act: S.act, at: Date.now() };
  let lb = {};
  try {
    lb = JSON.parse(localStorage.getItem('mrja-best') || '{}');
  } catch (e) {}
  const localBetter = !lb[key] || c.score > lb[key].score;
  if (localBetter) {
    lb[key] = entry;
    try {
      localStorage.setItem('mrja-best', JSON.stringify(lb));
    } catch (e) {}
  }
  if (!validRun(key, entry))
    return 'この記録は上限（1時間400局のペース）を超えているため、ランキングには載りません。';
  if (!BE)
    return localBetter
      ? '自己ベスト更新（ランキングに接続できないため、この端末に保存しました）'
      : 'この端末に記録しました（ランキングには接続していません）';
  if (!myDoc && BE.load) {
    try {
      myDoc = await BE.load();
    } catch (e) {
      return 'ランキングに接続できませんでした。記録はこの端末に保存しました。';
    }
  }
  const prev = myDoc && myDoc.runs && myDoc.runs[key];
  const better = !prev || c.score > prev.score;
  const runs = {};
  for (const [k, v] of Object.entries((myDoc && myDoc.runs) || {})) if (validRun(k, v)) runs[k] = v;
  if (better) runs[key] = entry;
  let cnt = countRun(myDoc);
  let newDoc = { ...cnt.doc, call: S.myCall, runs };
  try {
    try {
      await BE.save(newDoc);
    } catch (e) {
      // 端末の時計が大きくずれている等で練習回数の加算が弾かれたときは、回数は増やさず記録だけ保存する
      if (!cnt.counted) throw e;
      cnt = { counted: false, doc: docOf(myDoc) };
      newDoc = { ...cnt.doc, call: S.myCall, runs };
      await BE.save(newDoc);
    }
    myDoc = { ...newDoc, id: ME };
    if (!boardData.some(x => x.id === ME)) boardData.push(myDoc);
    else boardData = boardData.map(x => (x.id === ME ? myDoc : x));
    const list = rankList(key),
      rank = list.findIndex(x => x.id === ME) + 1;
    Object.assign(BV, { contest: RUN.contest, mode: RUN.mode, dur: String(RUN.dur) });
    renderBoard();
    const cat = `${contestLabel(RUN.contest)}・${durLabel(RUN.dur)}・${modeLabel(RUN.mode)}`;
    let rival = '';
    const mine = list[rank - 1];
    if (mine && rank > 1) {
      const up = list[rank - 2];
      rival = `あと ${up.score - mine.score + 1} 点で ${up.call} を抜いて ${rank - 1}位！`;
    } else if (mine && rank === 1 && list.length > 1)
      rival = `1位キープ中。2位の ${list[1].call} とは ${mine.score - list[1].score} 点差`;
    else if (mine && rank === 1) rival = 'ランキング1位！ 仲間を誘って勝負しよう';
    const pl = practiceList(),
      prank = pl.findIndex(x => x.id === ME) + 1;
    const pmsg = cnt.counted
      ? `今月 ${newDoc.monthPlays} 回目の練習${newDoc.streak >= 2 ? `（${newDoc.streak}日連続）` : ''}${prank ? `　練習量 ${prank}位` : ''}`
      : practiceOf(myDoc).monthPlays >= 0 && docOf(myDoc).dayPlays >= DAY_MAX
        ? `今日の練習は ${DAY_MAX} 回を超えたので、練習回数には数えていません`
        : '今回は練習回数に数えられませんでした（端末の時計がずれている可能性があります）';
    return (
      (better
        ? `${cat}で ${rank || '—'}位 / ${list.length}人`
        : `${cat}の順位は ${rank}位 / ${list.length}人`) +
      (rival ? '\n' + rival : '') +
      '\n' +
      pmsg
    );
  } catch (e) {
    return 'ランキングに保存できませんでした。通信状態を確認してください。';
  }
}
function practiceList() {
  return boardData
    .map(d => ({ id: d.id, call: String(d.call || '?'), ...practiceOf(d) }))
    .filter(r => r.monthPlays > 0)
    .sort((a, b) => b.monthPlays - a.monthPlays || b.streak - a.streak || b.plays - a.plays)
    .reduce((acc, r) => {
      const hit = acc.find(x => x.call === r.call);
      if (!hit) acc.push(r);
      else if (r.id === ME) hit.id = ME;
      return acc;
    }, []);
}
function rankList(key) {
  return (
    boardData
      .filter(d => d.runs && d.runs[key] && validRun(key, d.runs[key]))
      .map(d => ({ id: d.id, call: String(d.call || '?'), ...d.runs[key] }))
      .sort((a, b) => b.score - a.score || b.q - a.q)
      // 同じコールが別の端末から登録されていても、最高点の1件だけを載せる
      .reduce((acc, r) => {
        const hit = acc.find(x => x.call === r.call);
        if (!hit) acc.push(r);
        else if (r.id === ME) hit.id = ME;
        return acc;
      }, [])
  );
}
function renderBoard() {
  for (const b of $('segKind').children) b.setAttribute('aria-pressed', b.dataset.v === BV.kind);
  $('scoreTabs').hidden = BV.kind !== 'score';
  for (const b of $('segContest').children) b.setAttribute('aria-pressed', b.dataset.v === BV.contest);
  for (const b of $('segMode').children) b.setAttribute('aria-pressed', b.dataset.v === BV.mode);
  for (const b of $('segDur').children) b.setAttribute('aria-pressed', b.dataset.v === BV.dur);
  const box = $('boardList'),
    note = $('boardNote');
  if (dbState === 'wait') {
    box.innerHTML = '<div class="empty">読み込み中…</div>';
    note.textContent = '';
    return;
  }
  if (dbState === 'off') {
    let lb = {};
    try {
      lb = JSON.parse(localStorage.getItem('mrja-best') || '{}');
    } catch (e) {}
    const b = lb[keyOf(BV.contest, BV.mode, BV.dur)];
    box.innerHTML = '<div class="empty">ランキングに接続していません。記録はこの端末に保存されます。</div>';
    note.textContent = b ? `この端末での自己ベスト：${b.score}点（${b.q} QSO × ${b.mult}）` : '';
    return;
  }
  if (BV.kind === 'practice') {
    renderPractice(box, note);
    return;
  }
  const list = rankList(keyOf(BV.contest, BV.mode, BV.dur));
  if (!list.length) {
    box.innerHTML = `<div class="empty">まだ記録がありません。${contestLabel(BV.contest)}・${durLabel(BV.dur)}・${modeLabel(BV.mode)}を最後まで走ると、ここに載ります。</div>`;
    note.textContent = '';
    return;
  }
  box.innerHTML =
    '<div class="brow head"><span>順位</span><span>コール</span><span style="text-align:right">得点</span><span style="text-align:right">QSO×マルチ</span><span style="text-align:right">WPM</span></div>';
  list.slice(0, 100).forEach((r, i) => {
    const row = document.createElement('div');
    row.className = 'brow' + (i < 3 ? ' top' : '') + (r.id === ME ? ' mine' : '');
    const cells = [
      [String(i + 1), 'rk'],
      [r.call, 'cs'],
      [String(r.score), 'sc'],
      [`${r.q}×${r.mult}`, 'sub'],
      [String(r.wpm || '—'), 'sub']
    ];
    for (const [t, c] of cells) {
      const sp = document.createElement('span');
      sp.className = c;
      sp.textContent = t;
      row.appendChild(sp);
    }
    const pc = practiceOf(boardData.find(d => d.id === r.id));
    if (pc.monthPlays) {
      const sm = document.createElement('small');
      sm.className = 'pc';
      sm.textContent = `今月の練習 ${pc.monthPlays}回`;
      row.children[1].appendChild(sm);
    }
    box.appendChild(row);
  });
  const mine = list.findIndex(x => x.id === ME);
  note.textContent =
    (mine >= 0 ? `あなたは ${mine + 1}位 / ${list.length}人。` : '') + '各自の自己ベストを表示しています。';
}
function renderPractice(box, note) {
  const list = practiceList(),
    m = jstMonth();
  const label = `${+m.slice(5)}月`;
  if (!list.length) {
    box.innerHTML = `<div class="empty">${label}はまだ誰も練習していません。時間を決めたコンテストを最後まで走ると、1回と数えます。</div>`;
    note.textContent = '';
    return;
  }
  box.innerHTML =
    '<div class="brow head prow"><span>順位</span><span>コール</span><span style="text-align:right">今月</span><span style="text-align:right">累計</span><span style="text-align:right">連続</span></div>';
  list.slice(0, 100).forEach((r, i) => {
    const row = document.createElement('div');
    row.className = 'brow prow' + (i < 3 ? ' top' : '') + (r.id === ME ? ' mine' : '');
    const cells = [
      [String(i + 1), 'rk'],
      [r.call, 'cs'],
      [`${r.monthPlays}回`, 'sc'],
      [`${r.plays}回`, 'sub'],
      [r.streak ? `${r.streak}日` : '—', 'sub']
    ];
    for (const [t, c] of cells) {
      const sp = document.createElement('span');
      sp.className = c;
      sp.textContent = t;
      row.appendChild(sp);
    }
    box.appendChild(row);
  });
  const mine = list.findIndex(x => x.id === ME);
  note.textContent =
    (mine >= 0 ? `あなたは ${mine + 1}位 / ${list.length}人。` : '') +
    `${label}の完走回数で順位を決めています（1日${DAY_MAX}回まで、毎月1日にリセット）。時間を決めたコンテストを最後まで走った回を数えます。`;
}
for (const [id, k] of [
  ['segKind', 'kind'],
  ['segContest', 'contest'],
  ['segMode', 'mode'],
  ['segDur', 'dur']
])
  $(id).addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    BV[k] = b.dataset.v;
    renderBoard();
  });
const openBoard = () => {
  renderBoard();
  $('boardSheet').hidden = false;
};
$('boardBtn').addEventListener('click', openBoard);
$('resBoard').addEventListener('click', () => {
  $('resSheet').hidden = true;
  openBoard();
});
$('boardBack').addEventListener('click', () => ($('boardSheet').hidden = true));

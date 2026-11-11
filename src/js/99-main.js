document.addEventListener('focusout', () =>
  setTimeout(() => {
    if (!document.activeElement || document.activeElement === document.body) window.scrollTo(0, 0);
  }, 50)
);
if (window.visualViewport)
  visualViewport.addEventListener('resize', () => {
    if (!document.activeElement || !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))
      window.scrollTo(0, 0);
  });
renderLog();
renderFields();
updStats();
renderMe();
if (!logged) openLogin();

// 自動テスト用の入口：URL に ?e2e を付けて開いたときだけ、中の状態を読めるようにする
if (/[?&]e2e\b/.test(location.search)) {
  window.__cwr = {
    get stations() {
      return st;
    },
    get log() {
      return logArr;
    },
    get running() {
      return running;
    }
  };
}

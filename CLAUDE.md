# JA CW Runner — 作業する人（AI を含む）への指示

- 作業は必ず **このリポジトリの最新の main** から始める（`git pull`）。ほかの場所にあるコピー（古い作業フォルダ、claude.ai 上のページ、`dist/`）を直接直さない。
- 管理の全体像・設定一覧・手順は `docs/ADMIN.md`。遊び方は `README.md`（README には管理側の話を書かない）。
- 直すのは `src/`・`public/`・`firestore.rules`・`tools/`・`tests/`。`dist/` はビルドで作られるので直さない。`data/cwr-data.js` は `tools/convert-data.py` で作る。
- 直したら `npm run format`、`npm test`、`npm run test:e2e` を通してから main に push する。push すると GitHub Actions がテスト・公開・Firestore ルールの反映まで行う。
- 振る舞いを変えたら、`tests/` にその検査を足す。画面に依存しない計算は `src/js/25-rules.js` に置き、`tests/unit` から検査する。
- 公開リポジトリなので、メールアドレス・秘密鍵・シークレットキーを書かない。
- ユーザーは日本語で、平易な説明を好む。アマチュア無線（CW コンテスト）の用語はそのまま通じる。
- claude.ai 上のプレビュー（Artifact）を更新するときは、`npm run build` で作った `dist/artifact/index.html` と `dist/artifact/cwr-data.js` を使う。

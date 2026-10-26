# CW Runner

スマホでもPCでも遊べる、CWコンテストのパイルアップ練習シミュレータです。ALL JA（国内）とDX（599＋CQゾーン）の2つのモードがあります。ホーム画面に追加するとアプリとして起動でき、オフラインでも練習できます。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `index.html` | アプリ本体（音もゲームもすべてこの中） |
| `cwr-data.js` | 実在局データ（過去のコンテスト参加局） |
| `config.js` | ランキング用の Firebase 設定。空のままでも遊べる |
| `manifest.webmanifest` | アプリ化（ホーム画面に追加）のための情報 |
| `sw.js` | オフライン対応 |
| `icon-*.png` など | アプリのアイコン |
| `firestore.rules` | ランキング用データベースのルール（Firebase に貼る） |

## 1. サイトとして公開する

どちらか一方で公開してください。アプリ化には HTTPS が必要ですが、どちらも自動で HTTPS になります。

### GitHub Pages の場合

1. GitHub で新しいリポジトリを作る（例 `cw-runner`、Public）
2. このフォルダの中身をすべてアップロードする（「Add file」→「Upload files」にドラッグ）
3. リポジトリの「Settings」→「Pages」→ Branch を `main`、フォルダを `/ (root)` にして Save
4. 数分後、`https://<ユーザー名>.github.io/cw-runner/` で開けるようになる

### Cloudflare Pages の場合

1. Cloudflare にログインし「Workers & Pages」→「作成」→「Pages」→「アセットをアップロード」
2. プロジェクト名を入れ（例 `cw-runner`）、このフォルダをドラッグ＆ドロップ
3. `https://cw-runner.pages.dev` のようなURLで公開される

ここまでで遊べます。ランキングは各自の端末にだけ保存されます。

## 2. ランキングを有効にする（Firebase）

仲間とスコアを競うときだけ必要です。遊ぶ人はコールサインを入れるだけで、メールやパスワードの登録はいりません（裏側で「匿名ログイン」を使い、端末ごとに区別しています）。

1. https://console.firebase.google.com/ で「プロジェクトを作成」（名前は例 `cw-runner`。Google アナリティクスはオフで可）
2. 左メニュー「セキュリティ」→「Authentication」→「始める」→「ログイン方法」で **匿名** を有効にする（「自動クリーンアップ」はオフのまま）
3. Authentication の「設定」タブ →「承認済みドメイン」に公開したドメインを追加（例 `ユーザー名.github.io`、`cw-runner.pages.dev`）
4. 左メニュー「Database と Storage」→「Cloud Firestore」→「データベースの作成」→ Standard エディション、ロケーションは `asia-northeast1 (Tokyo)`、本番環境モード
5. Firestore の「ルール」タブに `firestore.rules` の中身を貼り付けて「公開」
6. プロジェクトの設定（歯車）→「マイアプリ」→ ウェブアプリ（`</>`）を追加 → 表示される `firebaseConfig` の中身を `config.js` に貼り付ける
7. `config.js` を公開先にアップロードし直す

Firebase の無料プラン（Spark）で、仲間内の規模なら十分に収まります。

## 3. アプリとしてインストールする

- **iPhone / iPad**：Safari で開き、共有ボタン →「ホーム画面に追加」
- **Android**：Chrome で開き、メニュー →「アプリをインストール」（または「ホーム画面に追加」）
- **PC**：Chrome / Edge で開き、アドレスバー右のインストールアイコンをクリック

## 更新するとき

1. ファイルを書き換えてアップロードし直す
2. `sw.js` の先頭にある `VERSION` の数字を上げる（例 `cw-runner-v1` → `cw-runner-v2`）

ネットにつながっていれば、次に開いたときに最新版になります。

## 補足

- コールサインの本人確認はしていません。仲間内で楽しむ前提です。
- 同じコールを別の端末で登録した場合、ランキングには最高点の1件だけが載ります。
- 「Morse Runner」（VE3NEA）の遊び方を参考にしていますが、プログラムは独自に作ったものです。
- `cwr-data.js` の参加局データは Morse Runner Community Edition（https://github.com/w7sst/MorseRunner）の `JARL_ALLJA.TXT`・`CQWWCW.txt`・`DXCC.LIST` を変換したもので、Mozilla Public License 2.0 に従います。このファイルを配布するときは、ファイル先頭の出典とライセンスの表記を残してください。

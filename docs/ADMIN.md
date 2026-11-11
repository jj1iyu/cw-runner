# JA CW Runner 管理メモ

遊び方は [README.md](../README.md)。このファイルは管理する人向けのメモです。

## 全体の仕組み

```
GitHub（このリポジトリ） ── main に push ──▶ GitHub Actions
                                              ├─ テスト（計算・Firestore ルール・ブラウザ動作・画面サイズ）
                                              ├─ ビルド → GitHub Pages で公開  https://jj1iyu.github.io/cw-runner/
                                              └─ Firestore ルールを反映（Google Cloud 連携を設定済みのとき）

遊ぶ人のブラウザ ─┬─ Firebase Authentication（匿名ログイン）
                  ├─ Cloud Firestore（scores：ランキング／feedback：意見）
                  ├─ App Check（reCAPTCHA / Fraud Defense でボット判定）
                  └─ Google アナリティクス

Google Apps Script「JA CW Runner 意見通知」── 10分おきに feedback を確認 → Gmail に通知
```

サーバー側のプログラムはありません。ゲームはすべてブラウザの中で動きます。

## いちばん大事な決まり

- **このリポジトリ（main ブランチ）が唯一の正本です。** 直すときは必ず最新の main から始め、直したら main に戻します。
- 公開されているファイル（`dist/`）や、ほかの場所にあるコピーを直接直さないでください。次の公開で消えます。
- **Firestore のルールは `firestore.rules` を直して push します。** Firebase の管理画面で直接書き換えると、次の公開で上書きされます。
- 公開リポジトリなので、**メールアドレス・秘密鍵・reCAPTCHA のシークレットキーなどは絶対に入れない**でください（`config.js` の Firebase 設定と reCAPTCHA のサイトキーは公開前提なので問題ありません）。

## フォルダ構成

| 場所 | 中身 |
|---|---|
| `src/index.html` | 画面の骨組み（`@@CSS@@`・`@@JS@@` の位置に下の2つが入る） |
| `src/css/app.css` | 見た目 |
| `src/js/*.js` | 動き。ファイル名の番号順に1つにつながる（下の表） |
| `src/sw.js` | オフライン対応。版はビルド時に自動で入る |
| `public/` | アイコン・`manifest.webmanifest`・`config.js`（Firebase の設定） |
| `data/cwr-data.js` | 実在局データ（`tools/convert-data.py` で生成） |
| `firestore.rules` | Firestore のルール |
| `apps-script/` | 意見通知の Apps Script（控え。実物は Apps Script 側） |
| `tools/` | ビルド・データ変換・アイコン生成 |
| `tests/` | 自動テスト |
| `.github/workflows/deploy.yml` | 自動テストと公開 |

### src/js の分け方

| ファイル | 役割 |
|---|---|
| `00-settings.js` | 初期設定（`DEF`）と保存 |
| `10-data-ja.js` | 都府県支庁ナンバー・プレフィックス・モールス符号表 |
| `11-util.js` | 乱数・カットナンバー・ナンバーの正規化・部分コール判定 |
| `12-data-dx.js` | ランダム生成用の DX エンティティ |
| `13-real-stations.js` | 実在局データの読み込み |
| `20-stations.js` | 相手局を作る（RST・カット・速度・信号の強さ） |
| `25-rules.js` | ランキングの上限・練習回数・称号・コールサインの形（画面に依存しない計算） |
| `30-audio.js` | 音（モールス音・ノイズ・QSB・マナーモード対策） |
| `40-engine.js` | 運用の流れ（送信・順番待ち・相手局の反応・ログ判定・ESM） |
| `50-screen.js` | 入力欄・ログ表示・得点表示・開始／停止 |
| `60-results.js` | 結果画面・実績 |
| `70-keys.js` | キー操作・画面キーパッド |
| `71-settings-ui.js` | 設定画面 |
| `72-login.js` | コールサインのログイン |
| `80-backend.js` | ランキングの接続先（Firebase／claude.ai）・App Check・アナリティクス |
| `81-ranking.js` | 記録の保存・ランキング表示（スコア／練習量） |
| `82-misc.js` | キーパッド表示切替・コンテスト表示 |
| `90-feedback.js` | 意見を送る |
| `99-main.js` | 起動 |

## 直して公開する手順

```bash
npm ci                                   # 初回だけ
npx playwright install chromium          # 初回だけ（ブラウザテスト用）
# … src/ を直す …
npm run format                           # 書式をそろえる
npm test                                 # 計算のテスト（数秒）
npm run test:e2e                         # ブラウザでの動作・画面サイズのテスト（1分弱）
npm run test:rules                       # Firestore ルールのテスト（Java 11 以上が必要）
git commit -am "何を直したか" && git push # あとは GitHub Actions が公開まで行う
```

- 公開の進み具合：GitHub の「Actions」タブ。テストが1つでも失敗すると公開されません。
- 戻したいとき：`git revert <コミット>` して push すると、前の状態で公開し直されます。
- アプリの版（`sw.js` の VERSION）はコミットごとに自動で変わるので、手で上げる必要はありません。

## 管理画面の設定一覧

| サービス | 設定 | 値・状態 |
|---|---|---|
| Firebase | プロジェクト | `cw-runner`（Spark＝無料プラン） |
| Authentication | ログイン方法 | 匿名のみ。「自動クリーンアップ」はオフ（オンにすると30日で別人扱いになる） |
| Authentication | 承認済みドメイン | `localhost`、`cw-runner.firebaseapp.com`、`cw-runner.web.app`、`jj1iyu.github.io` |
| Firestore | データベース | Standard、`asia-northeast1 (Tokyo)`、本番環境モード |
| Firestore | ルール | このリポジトリの `firestore.rules` |
| App Check | 証明書プロバイダ | Fraud Defense（reCAPTCHA Enterprise）、サイトキーは `public/config.js` の `appCheckKey` |
| App Check | 適用 | Firestore・Authentication とも「モニタリング」（強制はまだオフ） |
| reCAPTCHA | キー | ラベル「JA CW Runner」、ドメイン `jj1iyu.github.io` |
| アナリティクス | 測定 ID | `public/config.js` の `measurementId` |
| Google Cloud | API キーの制限 | ウェブサイト：`https://jj1iyu.github.io/*`、`https://cw-runner.firebaseapp.com/*` |
| GitHub Pages | 公開方式 | 「GitHub Actions」 |
| Apps Script | プロジェクト | 「JA CW Runner 意見通知」、トリガー `checkFeedback` 10分おき |

## よくある作業

### 意見を読む
Firebase コンソール → Firestore → データ → `feedback`。新しい意見は10分以内に Gmail にも届きます。

### 意見通知を止める／直す
script.google.com の「JA CW Runner 意見通知」→ トリガーで `checkFeedback` を削除すると止まります。
コードを直したときは `apps-script/feedback-notify.gs` にも同じ変更を入れておきます（通知先のアドレスは Apps Script 側にだけ書く）。

### App Check の強制をオンにする
1. App Check →「API」タブで、Cloud Firestore と Authentication の「検証済み」が数日続けて 95% 以上か確認
2. 未検証の内訳が「古いクライアント」中心なら問題なし。「不明な送信元」が多いときは原因を調べてから
3. 各行の「︙」→「適用」。古い版のまま開いている人は、開き直すまでランキングに保存できなくなる

### 実在局データを新しくする（ALL JA の新しいログが出たときなど）
```bash
git clone --depth 1 https://github.com/w7sst/MorseRunner /tmp/MorseRunner
python3 tools/convert-data.py /tmp/MorseRunner
npm test
```
データは Mozilla Public License 2.0。`data/cwr-data.js` 先頭の出典表記は消さないこと。

### アイコンを作り直す
`python3 tools/make-icons.py`（Pillow と DejaVu Sans Mono Bold が必要）。色は `src/css/app.css` の `--bg`・`--acc`・`--fg` に合わせてある。

### ランキングの変な記録を消す
Firebase コンソール → Firestore → `scores` → その人の行の「︙」→ 削除。（ルールで、上限を超える記録はそもそも保存できない）

## Firestore ルールの自動反映（Google Cloud との連携）

`deploy.yml` の「Firestore ルールを反映」は、GitHub のリポジトリ変数
`GCP_WORKLOAD_IDENTITY_PROVIDER` と `GCP_SERVICE_ACCOUNT` が設定されているときだけ動きます。
鍵ファイルを使わない「Workload Identity 連携」で、このリポジトリの main からだけ、ルールの更新だけができる設定です。
**設定済み**（2026年11月）。変数が消えるなどして未設定になったときは、`firestore.rules` を直したら Firebase コンソールの「ルール」に同じ内容を貼って公開してください。

現在の設定：

| 項目 | 値 |
|---|---|
| サービスアカウント | `github-rules-deploy@cw-runner.iam.gserviceaccount.com`（ロール：Firebase ルール管理者、Firebase 閲覧者、Cloud Datastore 閲覧者、Service Usage コンシューマー） |
| Workload Identity プール／プロバイダ | `github` ／ `github-actions`（発行元 `https://token.actions.githubusercontent.com`） |
| 属性の対応 | `google.subject=assertion.sub`、`attribute.repository=assertion.repository`、`attribute.ref=assertion.ref` |
| 属性条件 | `assertion.repository=='jj1iyu/cw-runner' && assertion.ref=='refs/heads/main'` |
| なりすまし許可 | プールの `repository = jj1iyu/cw-runner` にサービスアカウントの利用を許可 |
| GitHub リポジトリ変数 | `GCP_WORKLOAD_IDENTITY_PROVIDER`、`GCP_SERVICE_ACCOUNT` |

作り直すときは `tools/setup-gcp-wif.sh` を Google Cloud Shell で実行するか、上の表のとおり Google Cloud コンソールで作り、2つの値を GitHub の Settings → Secrets and variables → Actions → Variables に登録します。
連携をやめるときは、Google Cloud の「IAM と管理」→「Workload Identity 連携」でプール `github` を削除し、サービスアカウント `github-rules-deploy` を削除します。

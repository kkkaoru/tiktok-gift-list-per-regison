# tiktok-gift-list-per-region

日本の TikTok LIVE のギフト一覧を、ログインなしとログインありで取得して、配信画面に実際に出るギフトとの差をまとめるツールと、その結果です。

- TikTok はギフト欄の地域を**接続元の IP** で決めます（URL の `region` などのパラメーターは無視されます）。ログインなしの一覧は、AWS の東京リージョンに置いた API Gateway（HTTP プロキシ）経由で日本の IP から取得します
- 配信画面のギフト欄（下のバーと「More」）に出るのは、一覧のうち `is_displayed_on_panel` が true のギフトだけです。この値は**ログインした視聴者のリクエストでだけ**入るため、ログインありの一覧はセッション Cookie を付けて手元（日本）から取得します
- 指定した配信の一覧（`room_id` 付き、その配信を開いたときと同じ）で比べます。配信を指定しなければ、特定の配信に依存しない一覧で比べます

## 結果

`results/<取得日（日本時間）>/`

| パス                                                   | 内容                                                                                                                                                                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                                            | レポート: 件数の概要、比較ごとの「ログインありで配信画面に出るギフト」「ログインなしの一覧にあり配信画面に出ないギフト」（giftId で判定）の件数・画像・CSV へのリンク、取得方法、ギフト名の言語コード |
| `live/`（配信を指定しないときは `no-live/`）           | その比較のファイル                                                                                                                                                                                    |
| `<比較>/anonymous.json` / `.png`                       | ログインなしの一覧（`giftId`・`name`・`coins`・`imageUrl` を表示順で）とアトラス画像（64 px のセル、24 列）                                                                                           |
| `<比較>/signed-in.json` / `.png`                       | ログインありで配信画面に出るギフトと、一覧の件数（`listed`）、アトラス画像                                                                                                                            |
| `<比較>/hidden.png`                                    | ログインなしの一覧にあり、配信画面に出ないギフトのアトラス画像                                                                                                                                        |
| `<比較>/shown.csv`、`hidden.csv`、`signed-in-only.csv` | 差分のリスト（`no,giftId,name,coins,imageUrl`）。配信画面に出るギフト、出ないギフト、ログインありの一覧にだけあるギフト                                                                               |

CSV とアトラス画像はコインの少ない順（同じコインならギフト欄の表示順）、JSON はギフト欄の表示順です。

- [2026-10-22](results/2026-10-22/README.md): 配信 @ho_zuki_chitose の一覧は 690 種類で、配信画面に出るのは 186 種類（出ないのは 504 種類）

## 構成

```
src/
  tiktok/   TikTok の URL（ギフト一覧・room 検索）と応答の解析、表示フラグ、セッション Cookie、giftId での差分
  regions/  リージョン・言語の一覧、利用量の上限、CDK 出力（各ゲートウェイの URL）の読み込み
  report/   レポート（Markdown）
  atlas/    ギフト画像のアトラス化（セルへの縮小・格子への配置）
  cdk/      API Gateway のスタック（AWS CDK）
  cli/      deploy.sh（デプロイ・削除）、fetch.ts（取得とレポート作成）、images.ts（画像の取得・復号・PNG 書き出し）
results/    取得結果
```

API Gateway はリージョンごとに 1 つの REST API（リージョナル）で、転送先は次の 2 つだけです（HTTP プロキシ統合）。
レポートが使うのは東京（JP）の `/gift-list` と `/user-room` だけです。ほかのリージョン（`src/regions/regions.ts`）も同じ構成でデプロイされます。

| ゲートウェイのパス | 転送先                                                                           |
| ------------------ | -------------------------------------------------------------------------------- |
| `GET /gift-list`   | `https://webcast.tiktok.com/webcast/gift/list/`（ギフト一覧）                    |
| `GET /user-room`   | `https://www.tiktok.com/api-live/user/room/`（ユーザー名から配信の room を検索） |

- クエリ文字列とヘッダーはそのまま転送されます
- 呼び出しには API キー（`x-api-key`）が必須。利用量プランで 5 リクエスト/秒・1 日 1000 リクエストまで
- `{proxy+}` での転送は使いません（API Gateway が末尾の `/` を落とし、TikTok が 301 を返すため）

## 準備

- [Bun](https://bun.sh/)
- AWS CLI v2（2.32 以降の `aws login` が使えるもの）と、CloudFormation・API Gateway・（初回の CDK bootstrap 用に）S3・IAM・SSM・ECR を操作できるユーザー

```sh
bun install
aws login --profile personal          # ブラウザーでサインイン（プロファイル名は任意）
aws sts get-caller-identity --profile personal
```

## AWS へのデプロイ

```sh
AWS_PROFILE=personal bun run deploy
```

`src/cli/deploy.sh` が次を行います。

1. `aws configure export-credentials` でプロファイルの一時的な認証情報を CDK に渡す（CDK CLI は `aws login` のセッションを直接読めないため）
2. API キーを生成して `.relay/api-key` に保存（初回のみ。表示しない）
3. 各リージョンで CDK が未 bootstrap なら `cdk bootstrap`
4. `cdk deploy --all`（スタック `TikTokGiftList-JP` など 4 つ）。各ゲートウェイの URL を `.relay/outputs.json` に保存

`.relay/` は gitignore 済みです。API キーとゲートウェイの URL はコミットしないでください。

削除:

```sh
AWS_PROFILE=personal bun run destroy
```

（CDK bootstrap で作られた `CDKToolkit` スタックは残ります。不要なら CloudFormation から削除してください。）

## 取得

ログインありの一覧には、TikTok にログインしたアカウントのセッション Cookie `sessionid`（32 桁の 16 進数）が必要です。
Git 管理外の `private/tiktok-sessionid.secret`（権限 0600）に置き、環境変数に読み込んでから実行します。
値をチャット・シェル履歴・Git に書かないでください。

```sh
read -r TIKTOK_SESSIONID < private/tiktok-sessionid.secret
export TIKTOK_SESSIONID
bun run fetch                                               # 配信を指定しない比較
bun run fetch https://www.tiktok.com/@ho_zuki_chitose/live  # その配信の比較（@ユーザー名・room id も可）
```

1. 配信を指定したときは、東京のゲートウェイの `/user-room` でユーザー名から配信の room を調べる
2. ログインなし: 東京のゲートウェイで、ギフト一覧を `webcast_language=ja-JP` で取得（配信を指定したときは `room_id` 付き）
3. ログインあり: 同じ一覧を `Cookie: sessionid=...` を付けて手元から取得（セッションは AWS に送らない）。`is_displayed_on_panel` が 1 件もなければ、セッションが通らなかったとして止まる
4. ギフト欄のタブ（`page_type` 1）を表示順・重複なしで取り出し、giftId で比べて `results/<日付>/` を作り直す
5. ギフト画像を取得して（`.cache/images` にキャッシュ。画像 CDN は地域に関係しないので直接取得）アトラス画像を作る

## 開発

```sh
bun run format && bun run tsc && bun run lint && bun run coverage
bun run synth   # CloudFormation テンプレートの確認（デプロイしない）
```

テストは vitest（`src/**/*.test.ts`）です。CDK スタックは `aws-cdk-lib/assertions` で検証しています。

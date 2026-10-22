# tiktok-gift-list-per-region

TikTok LIVE のギフト欄（ギフト一覧）を、AWS の複数リージョンから取得して地域ごとの差分をまとめるツールと、その結果です。

TikTok はギフト欄の地域を**接続元の IP** で決めます（URL の `region` などのパラメーターは無視されます）。
そのため、各リージョンに置いた AWS API Gateway（HTTP プロキシ）を経由して取得し、
その国から見たギフト欄を得ます。処理は AWS だけに依存します。

## 結果

`results/<取得日>/<ユーザー名 または room-<id>>/`

| ファイル                                      | 内容                                                                                                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                                   | JP を基準にした地域ごとの差分表                                                                                                                          |
| `JP.json` / `US.json` / `GB.json` / `SG.json` | その地域の `region`（room を指定しない既定のギフト欄）と `room`（配信内のギフト欄）。各ギフトの `giftId`・`name`・`coins`・`imageUrl` をパネルの表示順で |

- [2026-10-22 @cassismilk02](results/2026-10-22/cassismilk02/README.md)
  - 既定のギフト欄: JP 689 / US 691 / GB 765 / SG 652 種類（JP との差は US +93 −91、GB +167 −91、SG +53 −90）
  - 配信内のギフト欄: どの地域から見ても 690 種類で同一（配信者の地域のギフト欄 + 配信者のカスタムギフト「かしすみるく」）

## リージョン

`src/regions/regions.ts` で定義しています。

| ラベル | AWS リージョン                 |
| ------ | ------------------------------ |
| JP     | ap-northeast-1（東京）         |
| US     | us-east-1（バージニア北部）    |
| GB     | eu-west-2（ロンドン）          |
| SG     | ap-southeast-1（シンガポール） |

## 構成

```
src/
  tiktok/   TikTok の URL（配信の指定・ギフト一覧・room 検索）と応答の解析、差分
  regions/  リージョン一覧と CDK 出力（各ゲートウェイの URL）の読み込み
  report/   差分表（Markdown）
  cdk/      API Gateway のスタック（AWS CDK）
  cli/      deploy.sh（デプロイ・削除）と fetch-regions.ts（取得）
results/    取得結果
```

API Gateway はリージョンごとに 1 つの REST API（リージョナル）で、転送先は次の 2 つだけです（HTTP プロキシ統合）。

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

```sh
bun run fetch @cassismilk02
# bun run fetch https://www.tiktok.com/@cassismilk02/live
# bun run fetch 7699422526320986886      # room id を直接
```

1. JP のゲートウェイで、ユーザー名から現在の配信の room id を検索（配信中でない場合は room id を直接指定）
2. 各リージョンのゲートウェイで、room を指定した一覧（配信内のギフト欄）と、room を指定しない一覧（その地域の既定のギフト欄）を取得
3. ギフト欄のタブ（`page_type` 1）を表示順・重複なしで取り出し、`results/<日付>/<名前>/` に書き出す

ギフト名は `ja-JP` で取得しています。どのギフトが並ぶかは言語ではなく、接続元の地域で決まります。

## 開発

```sh
bun run format && bun run tsc && bun run lint && bun run coverage
bun run synth   # CloudFormation テンプレートの確認（デプロイしない）
```

テストは vitest（`src/**/*.test.ts`）です。CDK スタックは `aws-cdk-lib/assertions` で検証しています。

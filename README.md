# tiktok-gift-list-per-region

TikTok LIVE のギフト欄（ギフト一覧）を、AWS の複数リージョンから取得して地域ごとの差分をまとめるツールと、その結果です。

TikTok はギフト欄の地域を**接続元の IP** で決めます（URL の `region` などのパラメーターは無視されます）。
そのため、各リージョンに置いた AWS API Gateway（HTTP プロキシ）を経由して取得し、
その国から見たギフト欄を得ます。処理は AWS だけに依存します。

## 結果

`results/<取得日>/`

| パス                                       | 内容                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `README.md`                                | レポート: 地域ごとの件数の概要と、JP を基準にした増えた分・減った分（giftId で判定）の表と画像                                 |
| `regions/<地域>.json`                      | その地域のギフト欄（配信を指定しない一覧、ギフト名はその地域の言語）。`giftId`・`name`・`coins`・`imageUrl` をパネルの表示順で |
| `rooms/<ユーザー名>.json`                  | 指定した配信の JP でのギフト欄（配信を指定したときだけ）                                                                       |
| `images/<地域>.png`                        | その地域のギフト欄のアトラス画像（64 px のセル、24 列、表の順に左上から）                                                      |
| `images/<地域>-added.png` / `-removed.png` | JP になくその地域にある / JP にありその地域にないギフトのアトラス画像（12 列）                                                 |
| `images/room-<ユーザー名>*.png`            | 配信内のギフト欄と、JP のギフト欄との差分のアトラス画像                                                                        |

- [2026-10-22](results/2026-10-22/README.md): ギフト欄は JP 689 / US 691 / GB 765 / SG 652 種類。
  @cassismilk02 の配信内のギフト欄は 690 種類（JP のギフト欄 + カスタムギフト「かしすみるく」）

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
  tiktok/   TikTok の URL（配信の指定・ギフト一覧・room 検索）と応答の解析、giftId での差分
  regions/  リージョン・言語の一覧と CDK 出力（各ゲートウェイの URL）の読み込み
  report/   レポート（Markdown）
  atlas/    ギフト画像のアトラス化（セルへの縮小・格子への配置）
  cdk/      API Gateway のスタック（AWS CDK）
  cli/      deploy.sh（デプロイ・削除）、fetch-regions.ts（取得）、images.ts（画像の取得・復号・PNG 書き出し）
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
bun run fetch                        # 各地域のギフト欄だけ
bun run fetch @cassismilk02          # + この配信の JP でのギフト欄
# bun run fetch https://www.tiktok.com/@cassismilk02/live
# bun run fetch 7699422526320986886  # room id を直接
```

1. 各地域のゲートウェイで、配信を指定しないギフト一覧をその地域の言語で取得（特定の配信に依存しない）
2. 配信を指定したときだけ、JP のゲートウェイでユーザー名から room を検索し、その配信のギフト一覧を取得
3. ギフト欄のタブ（`page_type` 1）を表示順・重複なしで取り出し、JP と giftId で比較して `results/<日付>/` に書き出す
4. ギフト画像を取得して（`.cache/images` にキャッシュ。画像 CDN は地域に関係しないので直接取得）アトラス画像を作る

## 開発

```sh
bun run format && bun run tsc && bun run lint && bun run coverage
bun run synth   # CloudFormation テンプレートの確認（デプロイしない）
```

テストは vitest（`src/**/*.test.ts`）です。CDK スタックは `aws-cdk-lib/assertions` で検証しています。

// Runs with bun.
import { expect, test } from 'vitest'

import { atlasPaths, reportMarkdown, roomAtlasPath, roomName } from './report'

const rose = { coins: 1, giftId: '5655', imageUrl: 'https://a/rose.webp', name: 'バラ' }
const roseEn = { coins: 1, giftId: '5655', imageUrl: 'https://a/rose.webp', name: 'Rose' }
const gg = { coins: 1, giftId: '6064', imageUrl: 'https://a/gg.webp', name: 'GG' }
const heart = { coins: 5, giftId: '7', imageUrl: 'https://a/heart.webp', name: 'ハート' }
const own = { coins: 1, giftId: '9', imageUrl: 'https://a/own.webp', name: 'Own' }
const jp = { awsRegion: 'ap-northeast-1', gifts: [rose, heart], label: 'JP', language: 'ja-JP' }
const us = { awsRegion: 'us-east-1', gifts: [roseEn, gg], label: 'US', language: 'en-US' }

test('names the atlas images next to the report', () => {
  expect(atlasPaths('US')).toStrictEqual({
    added: 'images/US-added.png',
    all: 'images/US.png',
  })
  expect(roomAtlasPath('cassismilk02')).toBe('images/room-cassismilk02.png')
  expect(roomName({ gifts: [], roomId: '7', source: '@a' })).toBe('a')
  expect(roomName({ gifts: [], roomId: '7', source: '7' })).toBe('room-7')
})

test('reports every region against the base region by giftId', () => {
  expect(
    reportMarkdown({
      base: 'JP',
      fetchedAt: '2026-10-22T10:00:00Z',
      regions: [jp, us, { ...us, gifts: [rose, heart], label: 'GB', language: 'en-GB' }],
      room: null,
    }),
  ).toBe(
    [
      '# TikTok LIVE のギフト欄（地域別）',
      '',
      '取得 2026-10-22T10:00:00Z。各地域のギフト欄は、その AWS リージョンの API Gateway から配信を指定せずに取得した一覧（TikTok は接続元の IP で地域を決める）。',
      'ギフト名はその地域の言語で、比較は giftId で JP を基準にしています。画像は表の順（左上から右へ、行ごと）。',
      '',
      '## 概要',
      '',
      '| 地域 | AWS リージョン | 言語 | ギフト数 | JP と共通 | JP になし | 画像 |',
      '| --- | --- | --- | ---: | ---: | ---: | --- |',
      '| JP | ap-northeast-1 | ja-JP | 2 | 2 | 0 | [一覧](images/JP.png) |',
      '| US | us-east-1 | en-US | 2 | 1 | 1 | [一覧](images/US.png) |',
      '| GB | us-east-1 | en-GB | 2 | 2 | 0 | [一覧](images/GB.png) |',
      '',
      '## 地域（IP）ごとの取得方法',
      '',
      'TikTok はギフト欄の地域を接続元の IP で決めます。そこで AWS の各リージョンに API Gateway（REST API、リージョナル、HTTP プロキシ統合）を 1 つずつ置き、そのリージョンの AWS の IP から TikTok に問い合わせています。',
      '',
      '| ゲートウェイのパス | 転送先 |',
      '| --- | --- |',
      '| `GET /gift-list` | `https://webcast.tiktok.com/webcast/gift/list/`（ギフト一覧） |',
      '| `GET /user-room` | `https://www.tiktok.com/api-live/user/room/`（ユーザー名から配信の room を検索） |',
      '',
      '```',
      'GET <そのリージョンのゲートウェイ>/gift-list?aid=1988&device_platform=web_pc&app_language=en-US&webcast_language=en-US',
      'x-api-key: <API キー>',
      '```',
      '',
      '- クエリ文字列とヘッダー（User-Agent など）はそのまま TikTok に転送されます。`room_id` を付けなければ、その地域の既定のギフト欄になります',
      '- 呼び出しには API キーが必須で、利用量プランで 5 リクエスト/秒・1 日 1000 リクエストに制限しています。ゲートウェイの URL と API キーは公開していません',
      '- 転送先は上の 2 つの URL に固定しています（`{proxy+}` で転送すると API Gateway が末尾の `/` を落とし、TikTok が 301 を返すため）',
      '- 構築は AWS CDK（`src/cdk/`）で、`AWS_PROFILE=<プロファイル> bun run deploy` で全リージョンにデプロイ、`bun run fetch [@ユーザー名]` で取得します（手順はリポジトリの README）',
      '- ギフト画像は画像 CDN から直接取得しています（画像は地域で変わらないため）',
      '',
      '## ギフト名の言語',
      '',
      'ギフト一覧 API（`https://webcast.tiktok.com/webcast/gift/list/`）のクエリ `app_language` と `webcast_language` に言語コード（`ja-JP`・`en-US`・`en-GB`・`zh-Hans` など）を指定すると、`name` がその言語で返ります。',
      '',
      '```',
      'https://webcast.tiktok.com/webcast/gift/list/?aid=1988&device_platform=web_pc&app_language=en-US&webcast_language=en-US',
      '```',
      '',
      '- どのギフトが並ぶかは言語ではなく接続元の IP（地域）で決まります。言語コードを変えても giftId の集合は変わらず、名前だけが変わります',
      '- `region` などの地域パラメーターは無視されます。地域は API Gateway のリージョンで切り替えています',
      '- 各地域で使う言語コードは `src/regions/regions.ts` の `language` で変更できます（上の概要の「言語」列）',
      '',
      '## JP のギフト一覧（ap-northeast-1、ja-JP）: 2 種類',
      '',
      '![JP のギフト一覧](images/JP.png)',
      '',
      'リストは [regions/JP.json](regions/JP.json)（giftId・名前・コイン・画像 URL を画像と同じ順で）。',
      '',
      '## JP との差分',
      '',
      '### US（us-east-1、en-US）',
      '',
      '#### JP になく US にある: 1 種類',
      '',
      '![JP になく US にある](images/US-added.png)',
      '',
      '<details>',
      '<summary>リスト（1 種類）</summary>',
      '',
      '| # | giftId | 名前 | コイン |',
      '| ---: | ---: | --- | ---: |',
      '| 1 | 6064 | GG | 1 |',
      '',
      '</details>',
      '',
      '### GB（us-east-1、en-GB）',
      '',
      '#### JP になく GB にある: なし',
      '',
    ].join('\n'),
  )
})

test('adds the live of the base region', () => {
  expect(
    reportMarkdown({
      base: 'JP',
      fetchedAt: '2026-10-22T10:00:00Z',
      regions: [jp],
      room: { gifts: [rose, heart, own], roomId: '77', source: '@cassismilk02' },
    })
      .split('\n')
      .slice(51),
  ).toStrictEqual([
    '## 配信 @cassismilk02（JP、room 77）',
    '',
    '配信内のギフト欄は 3 種類（[一覧](images/room-cassismilk02.png)）。',
    '',
    '#### 配信内だけにある: 1 種類',
    '',
    '![配信内だけにある](images/room-cassismilk02-added.png)',
    '',
    '<details>',
    '<summary>リスト（1 種類）</summary>',
    '',
    '| # | giftId | 名前 | コイン |',
    '| ---: | ---: | --- | ---: |',
    '| 1 | 9 | Own | 1 |',
    '',
    '</details>',
    '',
  ])
})

test('needs the base region', () => {
  expect(() => reportMarkdown({ base: 'JP', fetchedAt: 'x', regions: [], room: null })).toThrow(
    'No panel for the base region JP',
  )
})

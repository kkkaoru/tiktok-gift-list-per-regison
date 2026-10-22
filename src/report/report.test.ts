// Runs with bun.
import { expect, test } from 'vitest'

import {
  byCoins,
  comparisonPaths,
  giftCsv,
  hiddenGifts,
  reportMarkdown,
  resultDate,
  signedInOnly,
  targetName,
} from './report'

const rose = { coins: 1, giftId: '5655', imageUrl: 'https://a/rose.webp', name: 'バラ' }
const heart = { coins: 5, giftId: '7', imageUrl: 'https://a/heart.webp', name: 'ハート' }
const own = { coins: 1, giftId: '9', imageUrl: 'https://a/own.webp', name: 'Own\n' }
const noLive = {
  anonymous: {
    awsRegion: 'ap-northeast-1',
    fetchedAt: '2026-10-22T10:00:00Z',
    gifts: [rose, heart],
  },
  live: null,
  signedIn: { fetchedAt: '2026-10-22T10:00:01Z', gifts: [rose], listed: 2 },
}
const live = {
  anonymous: {
    awsRegion: 'ap-northeast-1',
    fetchedAt: '2026-10-22T10:00:02Z',
    gifts: [rose, heart],
  },
  live: { roomId: '77', url: 'https://www.tiktok.com/@a/live' },
  signedIn: { fetchedAt: '2026-10-22T10:00:03Z', gifts: [rose, own], listed: 3 },
}

test('writes a gift list as CSV, quoting what would break a row', () => {
  expect(giftCsv([rose, own, { ...heart, name: 'A, "B"' }])).toBe(
    'no,giftId,name,coins,imageUrl\r\n1,5655,バラ,1,https://a/rose.webp\r\n2,9,"Own\n",1,https://a/own.webp\r\n3,7,"A, ""B""",5,https://a/heart.webp\r\n',
  )
  expect(giftCsv([])).toBe('no,giftId,name,coins,imageUrl\r\n')
})

test('orders by coins, keeping the panel order among equal prices', () => {
  expect(byCoins([heart, rose, own]).map((gift) => gift.giftId)).toStrictEqual(['5655', '9', '7'])
})

test('dates a fetch in Japan', () => {
  expect(resultDate('2026-10-22T23:30:00.000Z')).toBe('2026-10-23')
  expect(resultDate('2026-10-22T10:00:00.000Z')).toBe('2026-10-22')
})

test('names what each comparison was read for and where its files go', () => {
  expect(targetName(null)).toBe('配信を指定しない一覧')
  expect(targetName({ roomId: '77', url: 'https://www.tiktok.com/@a/live' })).toBe(
    '配信 https://www.tiktok.com/@a/live（room 77）の一覧',
  )
  expect(targetName({ roomId: '77', url: null })).toBe('配信（room 77）の一覧')
  expect(comparisonPaths(null)).toStrictEqual({
    anonymousAtlas: 'no-live/anonymous.png',
    anonymousJson: 'no-live/anonymous.json',
    hiddenAtlas: 'no-live/hidden.png',
    hiddenCsv: 'no-live/hidden.csv',
    shownCsv: 'no-live/shown.csv',
    signedInAtlas: 'no-live/signed-in.png',
    signedInJson: 'no-live/signed-in.json',
    signedInOnlyCsv: 'no-live/signed-in-only.csv',
  })
  expect(comparisonPaths({ roomId: '77', url: null }).hiddenAtlas).toBe('live/hidden.png')
})

test('finds the signed-out gifts the live screen does not show', () => {
  expect(hiddenGifts(noLive)).toStrictEqual([
    { coins: 5, giftId: '7', imageUrl: 'https://a/heart.webp', name: 'ハート' },
  ])
  expect(signedInOnly(live)).toStrictEqual([
    { coins: 1, giftId: '9', imageUrl: 'https://a/own.webp', name: 'Own\n' },
  ])
})

test('sums up both comparisons, the live first', () => {
  const lines = reportMarkdown({ comparisons: [live, noLive] }).split('\n')
  expect(
    lines.slice(0, lines.indexOf('## 配信 https://www.tiktok.com/@a/live（room 77）の一覧')),
  ).toStrictEqual([
    '# TikTok LIVE のギフト欄（日本、ログインあり・なしの差）',
    '',
    '日本の IP から取得したギフト一覧を、ログインなしとログインありで比べています（配信 https://www.tiktok.com/@a/live（room 77）の一覧、配信を指定しない一覧）。比較は giftId、ギフト名は `webcast_language=ja-JP` で取得した日本語です（「ギフト名の言語コード」参照）。リストは CSV（`no,giftId,name,coins,imageUrl`）で、CSV と画像はコインの少ない順（同じコインならギフト欄の表示順）、画像は左上から右へ、行ごとです。',
    '',
    '## 概要',
    '',
    '| 対象 | 取得方法 | API の一覧 | 配信画面に出るギフト | 画像・データ |',
    '| --- | --- | ---: | ---: | --- |',
    '| 配信 https://www.tiktok.com/@a/live（room 77）の一覧 | ログインなし（AWS の API Gateway ap-northeast-1 経由） | 2 | 判別できない（`is_displayed_on_panel` がすべて false） | [画像](live/anonymous.png)・[JSON](live/anonymous.json) |',
    '| 配信 https://www.tiktok.com/@a/live（room 77）の一覧 | ログインあり（セッション Cookie、手元から） | 3 | 2 | [画像](live/signed-in.png)・[JSON](live/signed-in.json) |',
    '| 配信を指定しない一覧 | ログインなし（AWS の API Gateway ap-northeast-1 経由） | 2 | 判別できない（`is_displayed_on_panel` がすべて false） | [画像](no-live/anonymous.png)・[JSON](no-live/anonymous.json) |',
    '| 配信を指定しない一覧 | ログインあり（セッション Cookie、手元から） | 2 | 1 | [画像](no-live/signed-in.png)・[JSON](no-live/signed-in.json) |',
    '',
    '配信画面のギフト欄に出るのは、ログインありの一覧で `is_displayed_on_panel` が true のギフトだけです（配信を開いて数えたギフト欄の件数が、その配信を指定したログインありの一覧で true の件数と一致することを確認済み）。ログインなしの一覧には、配信画面に出ないギフトも含まれます。',
    '',
  ])
})

test('lists, per comparison, the shown gifts, the hidden ones and the signed-in-only ones', () => {
  const lines = reportMarkdown({ comparisons: [live] }).split('\n')
  const start = lines.indexOf('## 配信 https://www.tiktok.com/@a/live（room 77）の一覧')
  expect(lines.slice(start, lines.indexOf('## 取得方法'))).toStrictEqual([
    '## 配信 https://www.tiktok.com/@a/live（room 77）の一覧',
    '',
    '取得: ログインなし 2026-10-22T10:00:02Z、ログインあり 2026-10-22T10:00:03Z',
    '',
    '### ログインありで配信画面に出るギフト: 2 種類',
    '',
    '![ログインありで配信画面に出るギフト](live/signed-in.png)',
    '',
    'リスト: [live/shown.csv](live/shown.csv)',
    '',
    '### ログインなしの一覧にあり、ログインありでは配信画面に出ないギフト: 1 種類',
    '',
    '![ログインなしの一覧にあり、ログインありでは配信画面に出ないギフト](live/hidden.png)',
    '',
    'リスト: [live/hidden.csv](live/hidden.csv)',
    '',
    '### ログインありで配信画面に出て、ログインなしの一覧にないギフト: 1 種類',
    '',
    'リスト: [live/signed-in-only.csv](live/signed-in-only.csv)',
    '',
  ])
  expect(
    reportMarkdown({ comparisons: [noLive] })
      .split('\n')
      .filter((line) => line.startsWith('### ログインありで配信画面に出て')),
  ).toStrictEqual(['### ログインありで配信画面に出て、ログインなしの一覧にないギフト: なし'])
})

test('explains how the lists are read without the gateway URL or the session', () => {
  const lines = reportMarkdown({ comparisons: [noLive] }).split('\n')
  expect(
    lines.filter((line) =>
      /^(## 取得|## ギフト名|### ログイン(なし|あり)$|GET |Cookie|x-api-key)/u.test(line),
    ),
  ).toStrictEqual([
    '## 取得方法',
    '### ログインなし',
    'GET <東京リージョンのゲートウェイ>/gift-list?aid=1988&device_platform=web_pc&app_language=ja-JP&webcast_language=ja-JP&room_id=<配信の room（配信を指定するときだけ）>',
    'x-api-key: <API キー>',
    '### ログインあり',
    'GET https://webcast.tiktok.com/webcast/gift/list/?aid=1988&device_platform=web_pc&app_language=ja-JP&webcast_language=ja-JP&room_id=<配信の room（配信を指定するときだけ）>',
    'Cookie: sessionid=<ログイン済みアカウントのセッション>',
    '## ギフト名の言語コード',
  ])
  expect(
    lines.slice(
      lines.indexOf('## ギフト名の言語コード') + 4,
      lines.indexOf('## ギフト名の言語コード') + 8,
    ),
  ).toStrictEqual([
    '| クエリ | 送った値 | ギフト名への影響 |',
    '| --- | --- | --- |',
    '| `webcast_language` | `ja-JP` | ギフト名の言語を決める。省略すると英語になる |',
    '| `app_language` | `ja-JP` | ギフト名には影響しない（`webcast_language` と同じ値をそろえて送っている） |',
  ])
})

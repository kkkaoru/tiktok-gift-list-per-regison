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
      '## JP との差分',
      '',
      '### US（us-east-1、en-US）',
      '',
      '#### JP になく US にある: 1 種類',
      '',
      '![JP になく US にある](images/US-added.png)',
      '',
      '| # | giftId | 名前 | コイン |',
      '| ---: | ---: | --- | ---: |',
      '| 1 | 6064 | GG | 1 |',
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
      .slice(13),
  ).toStrictEqual([
    '## 配信 @cassismilk02（JP、room 77）',
    '',
    '配信内のギフト欄は 3 種類（[一覧](images/room-cassismilk02.png)）。',
    '',
    '#### 配信内だけにある: 1 種類',
    '',
    '![配信内だけにある](images/room-cassismilk02-added.png)',
    '',
    '| # | giftId | 名前 | コイン |',
    '| ---: | ---: | --- | ---: |',
    '| 1 | 9 | Own | 1 |',
    '',
  ])
})

test('needs the base region', () => {
  expect(() => reportMarkdown({ base: 'JP', fetchedAt: 'x', regions: [], room: null })).toThrow(
    'No panel for the base region JP',
  )
})

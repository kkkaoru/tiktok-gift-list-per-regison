// Runs with bun.
import { expect, test } from 'vitest'

import { reportMarkdown } from './report'

const rose = { coins: 1, giftId: '5655', imageUrl: 'https://a/rose.webp', name: 'Rose' }
const gg = { coins: 1, giftId: '6064', imageUrl: 'https://a/gg.webp', name: 'GG' }
const own = { coins: 1, giftId: '9', imageUrl: 'https://a/own.webp', name: 'Own' }

test('tabulates every region against the base region', () => {
  expect(
    reportMarkdown({
      base: 'JP',
      fetchedAt: '2026-10-22T10:00:00Z',
      panels: [
        { label: 'JP', region: [rose], room: [rose, own] },
        { label: 'US', region: [gg], room: [gg, own] },
      ],
      roomId: '77',
      source: '@cassismilk02',
    }),
  ).toBe(
    [
      '# @cassismilk02 のギフト欄（地域別）',
      '',
      '- 取得: 2026-10-22T10:00:00Z（room 77、各リージョンの AWS API Gateway 経由）',
      '- 差分の基準: JP（既定のギフト欄 = room を指定しない一覧、配信内 = この配信の room の一覧）',
      '- 配信内だけにあるギフト（JP）: 9 Own (1)',
      '',
      '| 地域 | 既定のギフト欄 | 既定: JP になく、この地域にある | 既定: JP にあり、この地域にない | 配信内のギフト欄 | 配信内: JP になく、この地域にある | 配信内: JP にあり、この地域にない |',
      '| --- | ---: | --- | --- | ---: | --- | --- |',
      '| JP | 1 | なし | なし | 2 | なし | なし |',
      '| US | 1 | 6064 GG (1) | 5655 Rose (1) | 2 | 6064 GG (1) | 5655 Rose (1) |',
      '',
    ].join('\n'),
  )
})

test('needs the base region', () => {
  expect(() =>
    reportMarkdown({ base: 'JP', fetchedAt: 'x', panels: [], roomId: '1', source: '@a' }),
  ).toThrow('No panels for the base region JP')
})

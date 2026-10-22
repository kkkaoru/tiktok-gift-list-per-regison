// Runs with bun.
import { expect, test } from 'vitest'

import {
  diffPanels,
  displayedGifts,
  gatewayUrl,
  giftListUrl,
  panelGifts,
  parseTikTokSource,
  roomIdOf,
  roomLookupUrl,
  sessionCookie,
} from './tiktok'

test('reads a @user, its live URL or a room id', () => {
  expect(parseTikTokSource('@cassismilk02')).toStrictEqual({ uniqueId: 'cassismilk02' })
  expect(parseTikTokSource(' https://www.tiktok.com/@cassis.milk_02/live ')).toStrictEqual({
    uniqueId: 'cassis.milk_02',
  })
  expect(parseTikTokSource('https://www.tiktok.com/@cassismilk02')).toStrictEqual({
    uniqueId: 'cassismilk02',
  })
  expect(parseTikTokSource('7699422526320986886')).toStrictEqual({ roomId: '7699422526320986886' })
})

test('rejects other hosts and shapes', () => {
  expect(parseTikTokSource('https://example.com/@cassismilk02/live')).toBe(null)
  expect(parseTikTokSource('https://www.tiktok.com/@cassismilk02/video/1')).toBe(null)
  expect(parseTikTokSource('cassismilk02')).toBe(null)
  expect(parseTikTokSource('')).toBe(null)
})

test('builds the room lookup and gift list URLs', () => {
  expect(roomLookupUrl('cassismilk02')).toBe(
    'https://www.tiktok.com/api-live/user/room/?aid=1988&sourceType=54&uniqueId=cassismilk02',
  )
  expect(giftListUrl({ language: 'ja-JP', roomId: '12' })).toBe(
    'https://webcast.tiktok.com/webcast/gift/list/?aid=1988&app_language=ja-JP&device_platform=web_pc&room_id=12&webcast_language=ja-JP',
  )
  expect(giftListUrl({ language: 'en-US', roomId: null })).toBe(
    'https://webcast.tiktok.com/webcast/gift/list/?aid=1988&app_language=en-US&device_platform=web_pc&webcast_language=en-US',
  )
})

test('takes the room id of a live user only', () => {
  expect(roomIdOf({ data: { user: { roomId: '77' } } })).toBe('77')
  expect(roomIdOf({ data: { user: { roomId: '0' } } })).toBe(null)
  expect(roomIdOf({ data: { user: {} } })).toBe(null)
  expect(roomIdOf(null)).toBe(null)
})

const gift = (id: number, name: string): Record<string, unknown> => ({
  diamond_count: 1,
  id,
  image: { url_list: [`https://p16-webcast.tiktokcdn.com/${id}.webp`] },
  name,
})

test('lists the gift tab once per gift in panel order', () => {
  expect(
    panelGifts({
      data: {
        pages: [
          { gifts: [gift(9, 'Limited')], page_type: 15 },
          { gifts: [gift(2, 'Rose'), gift(1, 'GG'), gift(2, 'Rose'), { id: 3 }], page_type: 1 },
        ],
      },
    }),
  ).toStrictEqual([
    { coins: 1, giftId: '2', imageUrl: 'https://p16-webcast.tiktokcdn.com/2.webp', name: 'Rose' },
    { coins: 1, giftId: '1', imageUrl: 'https://p16-webcast.tiktokcdn.com/1.webp', name: 'GG' },
  ])
  expect(panelGifts({ data: { pages: [] } })).toStrictEqual([])
  expect(panelGifts('x')).toStrictEqual([])
})

test('maps the two TikTok endpoints onto the gateway stage', () => {
  expect(
    gatewayUrl(
      'https://abc.execute-api.us-east-1.amazonaws.com/proxy/',
      'https://webcast.tiktok.com/webcast/gift/list/?aid=1988&room_id=7',
    ),
  ).toBe('https://abc.execute-api.us-east-1.amazonaws.com/proxy/gift-list?aid=1988&room_id=7')
  expect(
    gatewayUrl(
      'https://abc.execute-api.us-east-1.amazonaws.com/proxy/',
      'https://www.tiktok.com/api-live/user/room/?uniqueId=a',
    ),
  ).toBe('https://abc.execute-api.us-east-1.amazonaws.com/proxy/user-room?uniqueId=a')
  expect(() => gatewayUrl('https://abc/proxy/', 'https://www.tiktok.com/other/')).toThrow(
    'No gateway route for https://www.tiktok.com/other/',
  )
})

test('lists the gifts only one of two panels has', () => {
  const rose = { coins: 1, giftId: '5655', imageUrl: 'https://a/rose.webp', name: 'Rose' }
  const gg = { coins: 1, giftId: '6064', imageUrl: 'https://a/gg.webp', name: 'GG' }
  const star = { coins: 99, giftId: '7', imageUrl: 'https://a/star.webp', name: 'Star' }
  expect(diffPanels([rose, gg], [gg, star])).toStrictEqual({
    added: [{ coins: 99, giftId: '7', imageUrl: 'https://a/star.webp', name: 'Star' }],
    removed: [{ coins: 1, giftId: '5655', imageUrl: 'https://a/rose.webp', name: 'Rose' }],
  })
  expect(diffPanels([rose], [rose])).toStrictEqual({ added: [], removed: [] })
})

test('keeps only the gifts the live screen shows', () => {
  expect(
    displayedGifts({
      data: {
        pages: [
          {
            gifts: [
              { ...gift(2, 'Rose'), is_displayed_on_panel: true },
              { ...gift(1, 'GG'), is_displayed_on_panel: false },
              gift(3, 'Star'),
            ],
            page_type: 1,
          },
        ],
      },
    }),
  ).toStrictEqual([
    { coins: 1, giftId: '2', imageUrl: 'https://p16-webcast.tiktokcdn.com/2.webp', name: 'Rose' },
  ])
  expect(displayedGifts(null)).toStrictEqual([])
})

test('sends only a well-formed session as a cookie', () => {
  expect(sessionCookie('0123456789abcdef0123456789ABCDEF')).toBe(
    'sessionid=0123456789abcdef0123456789ABCDEF',
  )
  expect(sessionCookie('0123456789abcdef')).toBe(null)
  expect(sessionCookie('0123456789abcdef0123456789abcdef; x=1')).toBe(null)
  expect(sessionCookie(undefined)).toBe(null)
})

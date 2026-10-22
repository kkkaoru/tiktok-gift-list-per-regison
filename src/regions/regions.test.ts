// Runs with bun.
import { expect, test } from 'vitest'

import { parseEndpoints, stackName } from './regions'

test('names one stack per region', () => {
  expect(stackName('JP')).toBe('TikTokGiftList-JP')
})

test('reads the gateway URLs of the deployed regions in region order', () => {
  expect([
    ...parseEndpoints({
      'TikTokGiftList-SG': {
        Endpoint: 'https://s.execute-api.ap-southeast-1.amazonaws.com/proxy/',
      },
      'TikTokGiftList-JP': {
        Endpoint: 'https://j.execute-api.ap-northeast-1.amazonaws.com/proxy/',
      },
      'TikTokGiftList-US': { Endpoint: 'http://insecure' },
      'TikTokGiftList-GB': {},
      Other: { Endpoint: 'https://x' },
    }),
  ]).toStrictEqual([
    ['JP', 'https://j.execute-api.ap-northeast-1.amazonaws.com/proxy/'],
    ['SG', 'https://s.execute-api.ap-southeast-1.amazonaws.com/proxy/'],
  ])
  expect([...parseEndpoints(null)]).toStrictEqual([])
})

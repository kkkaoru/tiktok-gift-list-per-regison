// Runs with bun.
import { App } from 'aws-cdk-lib'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { expect, test } from 'vitest'

import { GiftListStack } from './stack'

const template = (): Template =>
  Template.fromStack(
    new GiftListStack(new App(), 'TikTokGiftList-US', {
      apiKeyValue: 'test-key-0123456789abcdef',
      env: { account: '123456789012', region: 'us-east-1' },
    }),
  )

test('forwards only the two TikTok endpoints, each behind the API key', () => {
  const methods = template().findResources('AWS::ApiGateway::Method')
  expect(
    Object.values(methods)
      .map((method) => [
        method['Properties']['HttpMethod'],
        method['Properties']['ApiKeyRequired'],
        method['Properties']['Integration']['Uri'],
        method['Properties']['Integration']['Type'],
      ])
      .toSorted(),
  ).toStrictEqual([
    ['GET', true, 'https://webcast.tiktok.com/webcast/gift/list/', 'HTTP_PROXY'],
    ['GET', true, 'https://www.tiktok.com/api-live/user/room/', 'HTTP_PROXY'],
  ])
})

test('limits the key to a small daily quota and outputs the stage URL', () => {
  const stack = template()
  stack.hasResourceProperties('AWS::ApiGateway::UsagePlan', {
    Quota: { Limit: 1000, Period: 'DAY' },
    Throttle: { BurstLimit: 10, RateLimit: 5 },
  })
  stack.hasResourceProperties('AWS::ApiGateway::ApiKey', { Value: 'test-key-0123456789abcdef' })
  stack.hasResourceProperties('AWS::ApiGateway::RestApi', {
    EndpointConfiguration: { Types: ['REGIONAL'] },
    Name: 'tiktok-gift-list-us-east-1',
  })
  stack.hasOutput('Endpoint', { Value: Match.anyValue() })
})

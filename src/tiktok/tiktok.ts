// Runs with bun.
// Where the gift atlas source comes from on TikTok: any live (a @user, its live URL or a room id)
// and the gift panel of that room (the webcast gift list, which differs per region and room).
// TikTok picks the region from the caller's IP (region parameters are ignored), so every request
// goes out through the API Gateway HTTP proxy (src/cdk/) of one AWS region.
interface TikTokGift {
  readonly coins: number
  readonly giftId: string
  readonly imageUrl: string
  readonly name: string
}

interface GiftListQuery {
  readonly language: string
  // null: the region's default panel, without a room's own gifts.
  readonly roomId: string | null
}

interface PanelDiff {
  // In the other panel only / in the base panel only.
  readonly added: readonly TikTokGift[]
  readonly removed: readonly TikTokGift[]
}

type TikTokSource = { readonly roomId: string } | { readonly uniqueId: string }

const WEBCAST: string = 'https://webcast.tiktok.com/webcast/gift/list/'
const ROOM_LOOKUP: string = 'https://www.tiktok.com/api-live/user/room/'
const AID: string = '1988'
// The only TikTok endpoints the gateway forwards to, by gateway path (exact URLs: API Gateway
// drops trailing slashes from proxied paths and TikTok then answers 301).
export const GATEWAY_ROUTES: ReadonlyMap<string, string> = new Map([
  [WEBCAST, 'gift-list'],
  [ROOM_LOOKUP, 'user-room'],
])
// The "ギフト" tab of the gift panel.
const GIFT_PAGE_TYPE: number = 1
const USER_PATTERN: RegExp = /^@([\w.]+)$/u
const URL_USER_PATTERN: RegExp = /^\/@([\w.]+)(?:\/live)?\/?$/u

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null

const fromUrl = (input: string): TikTokSource | null => {
  try {
    const url = new URL(input)
    const match = url.hostname.endsWith('tiktok.com') ? URL_USER_PATTERN.exec(url.pathname) : null
    return match?.[1] === undefined ? null : { uniqueId: match[1] }
  } catch {
    return null
  }
}

// `@user`, `https://www.tiktok.com/@user/live` or a numeric room id.
export const parseTikTokSource = (input: string): TikTokSource | null => {
  const text = input.trim()
  if (/^\d+$/u.test(text)) {
    return { roomId: text }
  }
  const user = USER_PATTERN.exec(text)?.[1]
  return user === undefined ? fromUrl(text) : { uniqueId: user }
}

// The API Gateway URL of a TikTok endpoint URL: /<route>?<query> (see src/cdk/stack.ts).
export const gatewayUrl = (endpoint: string, url: string): string => {
  const target = new URL(url)
  const route = GATEWAY_ROUTES.get(`${target.origin}${target.pathname}`)
  if (route === undefined) {
    throw new Error(`No gateway route for ${target.origin}${target.pathname}`)
  }
  return new URL(`${route}${target.search}`, endpoint).href
}

export const roomLookupUrl = (uniqueId: string): string =>
  `${ROOM_LOOKUP}?${new URLSearchParams({ aid: AID, sourceType: '54', uniqueId })}`

// No region parameter: TikTok ignores it and takes the caller's.
export const giftListUrl = ({ language, roomId }: GiftListQuery): string =>
  `${WEBCAST}?${new URLSearchParams({
    aid: AID,
    app_language: language,
    device_platform: 'web_pc',
    ...(roomId === null ? {} : { room_id: roomId }),
    webcast_language: language,
  })}`

export const roomIdOf = (body: unknown): string | null => {
  const data = isRecord(body) ? body['data'] : null
  const user = isRecord(data) ? data['user'] : null
  const roomId = isRecord(user) ? user['roomId'] : null
  return typeof roomId === 'string' && /^\d+$/u.test(roomId) && roomId !== '0' ? roomId : null
}

const toGift = (value: unknown): TikTokGift | null => {
  if (!isRecord(value)) {
    return null
  }
  const { diamond_count: coins, id, image, name } = value
  const urls = isRecord(image) ? image['url_list'] : null
  const imageUrl: unknown = Array.isArray(urls) ? urls[0] : null
  return typeof id === 'number' &&
    typeof name === 'string' &&
    typeof coins === 'number' &&
    typeof imageUrl === 'string'
    ? { coins, giftId: String(id), imageUrl, name }
    : null
}

// The gift tab in panel order, each gift once (the panel repeats a few in several groups).
export const panelGifts = (body: unknown): readonly TikTokGift[] => {
  const data = isRecord(body) ? body['data'] : null
  const pages: unknown = isRecord(data) ? data['pages'] : null
  const page: unknown = Array.isArray(pages)
    ? pages.find((entry) => isRecord(entry) && entry['page_type'] === GIFT_PAGE_TYPE)
    : null
  const gifts: unknown = isRecord(page) ? page['gifts'] : null
  return (Array.isArray(gifts) ? gifts : [])
    .map(toGift)
    .filter((gift): gift is TikTokGift => gift !== null)
    .filter((gift, index, all) => all.findIndex((other) => other.giftId === gift.giftId) === index)
}

const missingFrom =
  (gifts: readonly TikTokGift[]) =>
  (gift: TikTokGift): boolean =>
    !gifts.some((other) => other.giftId === gift.giftId)

export const diffPanels = (
  base: readonly TikTokGift[],
  other: readonly TikTokGift[],
): PanelDiff => ({
  added: other.filter(missingFrom(base)),
  removed: base.filter(missingFrom(other)),
})

export type { PanelDiff, TikTokGift, TikTokSource }

// Runs with bun.
// The per-region report (Markdown): an overview of every region's own gift panel (no stream, names
// in the region's language) against the base region, then per region the gifts it has that the
// base region does not, with their atlas images, and optionally one live's panel in the base region. Table rows follow
// the atlas cells (left to right, top to bottom), see atlasPaths.
import { GATEWAY_LIMITS } from '../regions/regions'
import { diffPanels } from '../tiktok/tiktok'
import type { TikTokGift } from '../tiktok/tiktok'

interface RegionPanel {
  readonly awsRegion: string
  readonly gifts: readonly TikTokGift[]
  readonly label: string
  readonly language: string
}

interface RoomPanel {
  readonly gifts: readonly TikTokGift[]
  readonly roomId: string
  readonly source: string
}

interface ReportInput {
  readonly base: string
  readonly fetchedAt: string
  readonly regions: readonly RegionPanel[]
  readonly room: RoomPanel | null
}

interface AtlasPaths {
  readonly added: string
  readonly all: string
}

interface GiftSection {
  readonly gifts: readonly TikTokGift[]
  readonly image: string
  readonly title: string
}

// Relative to the report: images/<LABEL>.png and images/<LABEL>-added.png.
export const atlasPaths = (label: string): AtlasPaths => ({
  added: `images/${label}-added.png`,
  all: `images/${label}.png`,
})

export const roomAtlasPath = (name: string): string => `images/room-${name}.png`

// How each region's panel is read from that region's IP (no gateway URLs: they stay in .relay/).
const REGION_SECTION: readonly string[] = [
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
  'GET <そのリージョンのゲートウェイ>/gift-list?aid=1988&device_platform=web_pc&app_language=ja-JP&webcast_language=ja-JP',
  'x-api-key: <API キー>',
  '```',
  '',
  '- クエリ文字列とヘッダー（User-Agent など）はそのまま TikTok に転送されます。`room_id` を付けなければ、その地域の既定のギフト欄になります',
  `- 呼び出しには API キーが必須で、利用量プランで ${GATEWAY_LIMITS.rate} リクエスト/秒・1 日 ${GATEWAY_LIMITS.daily} リクエストに制限しています。ゲートウェイの URL と API キーは公開していません`,
  '- 転送先は上の 2 つの URL に固定しています（`{proxy+}` で転送すると API Gateway が末尾の `/` を落とし、TikTok が 301 を返すため）',
  '- 構築は AWS CDK（`src/cdk/`）で、`AWS_PROFILE=<プロファイル> bun run deploy` で全リージョンにデプロイ、`bun run fetch [@ユーザー名]` で取得します（手順はリポジトリの README）',
  '- ギフト画像は画像 CDN から直接取得しています（画像は地域で変わらないため）',
  '',
]

// How the gift names are asked for in a language (the gift set itself follows the caller's IP).
const LANGUAGE_SECTION: readonly string[] = [
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
]

// A table cell: TikTok names can carry line breaks, non-breaking spaces or a pipe, which would
// split the row (the JSON keeps the name as sent).
export const tableCell = (text: string): string =>
  text.replaceAll(/\s+/gu, ' ').trim().replaceAll('|', '\\|')

// Results folder of a fetch: its date in Japan (where the fetches are run), not in UTC.
export const resultDate = (fetchedAt: string): string =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date(fetchedAt))

// Folded on GitHub (<details>); the blank lines let the table render inside it.
const giftTable = (gifts: readonly TikTokGift[]): readonly string[] => [
  '<details>',
  `<summary>リスト（${gifts.length} 種類）</summary>`,
  '',
  '| # | giftId | 名前 | コイン |',
  '| ---: | ---: | --- | ---: |',
  ...gifts.map(
    (gift, index) => `| ${index + 1} | ${gift.giftId} | ${tableCell(gift.name)} | ${gift.coins} |`,
  ),
  '',
  '</details>',
]

const section = ({ gifts, image, title }: GiftSection): readonly string[] =>
  gifts.length === 0
    ? [`#### ${title}: なし`, '']
    : [
        `#### ${title}: ${gifts.length} 種類`,
        '',
        `![${title}](${image})`,
        '',
        ...giftTable(gifts),
        '',
      ]

const overviewRow = (base: RegionPanel, panel: RegionPanel): string => {
  const { added } = diffPanels(base.gifts, panel.gifts)
  const shared = panel.gifts.length - added.length
  return `| ${panel.label} | ${panel.awsRegion} | ${panel.language} | ${panel.gifts.length} | ${shared} | ${added.length} | [一覧](${atlasPaths(panel.label).all}) |`
}

// Named in this region's language.
const regionSection = (base: RegionPanel, panel: RegionPanel): readonly string[] => [
  `### ${panel.label}（${panel.awsRegion}、${panel.language}）`,
  '',
  ...section({
    gifts: diffPanels(base.gifts, panel.gifts).added,
    image: atlasPaths(panel.label).added,
    title: `${base.label} になく ${panel.label} にある`,
  }),
]

const roomName = (room: RoomPanel): string =>
  room.source.startsWith('@') ? room.source.slice(1) : `room-${room.roomId}`

const roomSection = (base: RegionPanel, room: RoomPanel | null): readonly string[] => {
  if (room === null) {
    return []
  }
  return [
    `## 配信 ${room.source}（${base.label}、room ${room.roomId}）`,
    '',
    `配信内のギフト欄は ${room.gifts.length} 種類（[一覧](${roomAtlasPath(roomName(room))})）。`,
    '',
    ...section({
      gifts: diffPanels(base.gifts, room.gifts).added,
      image: roomAtlasPath(`${roomName(room)}-added`),
      title: '配信内だけにある',
    }),
  ]
}

export const reportMarkdown = ({ base, fetchedAt, regions, room }: ReportInput): string => {
  const reference = regions.find((panel) => panel.label === base)
  if (reference === undefined) {
    throw new Error(`No panel for the base region ${base}`)
  }
  const others = regions.filter((panel) => panel !== reference)
  return [
    '# TikTok LIVE のギフト欄（地域別）',
    '',
    `取得 ${fetchedAt}。各地域のギフト欄は、その AWS リージョンの API Gateway から配信を指定せずに取得した一覧（TikTok は接続元の IP で地域を決める）。`,
    `ギフト名はその地域の言語で、比較は giftId で ${base} を基準にしています。画像はリスト（表・JSON）と同じ順（左上から右へ、行ごと）。`,
    '',
    '## 概要',
    '',
    `| 地域 | AWS リージョン | 言語 | ギフト数 | ${base} と共通 | ${base} になし | 画像 |`,
    '| --- | --- | --- | ---: | ---: | ---: | --- |',
    ...regions.map((panel) => overviewRow(reference, panel)),
    '',
    ...REGION_SECTION,
    ...LANGUAGE_SECTION,
    `## ${base} のギフト一覧（${reference.awsRegion}、${reference.language}）: ${reference.gifts.length} 種類`,
    '',
    `![${base} のギフト一覧](${atlasPaths(base).all})`,
    '',
    `リストは [regions/${base}.json](regions/${base}.json)（giftId・名前・コイン・画像 URL を画像と同じ順で）。`,
    '',
    `## ${base} との差分`,
    '',
    ...others.flatMap((panel) => regionSection(reference, panel)),
    ...roomSection(reference, room),
  ].join('\n')
}

export { roomName }
export type { AtlasPaths, RegionPanel, ReportInput, RoomPanel }

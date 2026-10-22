// Runs with bun.
// The per-region report (Markdown): an overview of every region's own gift panel (no stream, names
// in the region's language) against the base region, then per region the gifts it adds and lacks
// with their atlas images, and optionally one live's panel in the base region. Table rows follow
// the atlas cells (left to right, top to bottom), see atlasPaths.
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
  readonly removed: string
}

interface GiftSection {
  readonly gifts: readonly TikTokGift[]
  readonly image: string
  readonly title: string
}

// Relative to the report: images/<LABEL>.png and images/<LABEL>-added|removed.png.
export const atlasPaths = (label: string): AtlasPaths => ({
  added: `images/${label}-added.png`,
  all: `images/${label}.png`,
  removed: `images/${label}-removed.png`,
})

export const roomAtlasPath = (name: string): string => `images/room-${name}.png`

const giftTable = (gifts: readonly TikTokGift[]): readonly string[] => [
  '| # | giftId | 名前 | コイン |',
  '| ---: | ---: | --- | ---: |',
  ...gifts.map((gift, index) => `| ${index + 1} | ${gift.giftId} | ${gift.name} | ${gift.coins} |`),
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
  const { added, removed } = diffPanels(base.gifts, panel.gifts)
  const shared = panel.gifts.length - added.length
  return `| ${panel.label} | ${panel.awsRegion} | ${panel.language} | ${panel.gifts.length} | ${shared} | ${added.length} | ${removed.length} | [一覧](${atlasPaths(panel.label).all}) |`
}

// Added gifts are named in this region's language, removed ones in the base region's.
const regionSection = (base: RegionPanel, panel: RegionPanel): readonly string[] => {
  const { added, removed } = diffPanels(base.gifts, panel.gifts)
  const paths = atlasPaths(panel.label)
  return [
    `### ${panel.label}（${panel.awsRegion}、${panel.language}）`,
    '',
    ...section({
      gifts: added,
      image: paths.added,
      title: `${base.label} になく ${panel.label} にある`,
    }),
    ...section({
      gifts: removed,
      image: paths.removed,
      title: `${base.label} にあり ${panel.label} にない（名前は ${base.language}）`,
    }),
  ]
}

const roomName = (room: RoomPanel): string =>
  room.source.startsWith('@') ? room.source.slice(1) : `room-${room.roomId}`

const roomSection = (base: RegionPanel, room: RoomPanel | null): readonly string[] => {
  if (room === null) {
    return []
  }
  const { added, removed } = diffPanels(base.gifts, room.gifts)
  return [
    `## 配信 ${room.source}（${base.label}、room ${room.roomId}）`,
    '',
    `配信内のギフト欄は ${room.gifts.length} 種類（[一覧](${roomAtlasPath(roomName(room))})）。${base.label} のギフト欄との差:`,
    '',
    ...section({
      gifts: added,
      image: roomAtlasPath(`${roomName(room)}-added`),
      title: '配信内だけにある',
    }),
    ...section({
      gifts: removed,
      image: roomAtlasPath(`${roomName(room)}-removed`),
      title: '配信内にない',
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
    `ギフト名はその地域の言語で、比較は giftId で ${base} を基準にしています。画像は表の順（左上から右へ、行ごと）。`,
    '',
    '## 概要',
    '',
    `| 地域 | AWS リージョン | 言語 | ギフト数 | ${base} と共通 | ${base} になし | この地域になし | 画像 |`,
    '| --- | --- | --- | ---: | ---: | ---: | ---: | --- |',
    ...regions.map((panel) => overviewRow(reference, panel)),
    '',
    `## ${base} との差分`,
    '',
    ...others.flatMap((panel) => regionSection(reference, panel)),
    ...roomSection(reference, room),
  ].join('\n')
}

export { roomName }
export type { AtlasPaths, RegionPanel, ReportInput, RoomPanel }

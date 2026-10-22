// Runs with bun.
// Writes the per-region comparison of gift panels as Markdown.
import { diffPanels } from '../tiktok/tiktok'
import type { TikTokGift } from '../tiktok/tiktok'

interface RegionPanels {
  readonly label: string
  // The region's default gift panel (no room) and the panel inside the room.
  readonly region: readonly TikTokGift[]
  readonly room: readonly TikTokGift[]
}

interface ReportInput {
  readonly base: string
  readonly fetchedAt: string
  readonly panels: readonly RegionPanels[]
  readonly roomId: string
  readonly source: string
}

const brief = (gift: TikTokGift): string => `${gift.giftId} ${gift.name} (${gift.coins})`

const list = (gifts: readonly TikTokGift[]): string =>
  gifts.length === 0 ? 'なし' : gifts.map(brief).join('<br>')

const changes = (base: readonly TikTokGift[], other: readonly TikTokGift[]): string => {
  const { added, removed } = diffPanels(base, other)
  return `${list(added)} | ${list(removed)}`
}

// Default panels against the base region's default panel, room panels against its room panel.
const row = (base: RegionPanels, panels: RegionPanels): string =>
  `| ${panels.label} | ${panels.region.length} | ${changes(base.region, panels.region)} | ${panels.room.length} | ${changes(base.room, panels.room)} |`

export const reportMarkdown = ({
  base,
  fetchedAt,
  panels,
  roomId,
  source,
}: ReportInput): string => {
  const reference = panels.find((panels) => panels.label === base)
  if (reference === undefined) {
    throw new Error(`No panels for the base region ${base}`)
  }
  return [
    `# ${source} のギフト欄（地域別）`,
    '',
    `- 取得: ${fetchedAt}（room ${roomId}、各リージョンの AWS API Gateway 経由）`,
    `- 差分の基準: ${base}（既定のギフト欄 = room を指定しない一覧、配信内 = この配信の room の一覧）`,
    `- 配信内だけにあるギフト（${base}）: ${list(diffPanels(reference.region, reference.room).added)}`,
    '',
    `| 地域 | 既定のギフト欄 | 既定: ${base} になく、この地域にある | 既定: ${base} にあり、この地域にない | 配信内のギフト欄 | 配信内: ${base} になく、この地域にある | 配信内: ${base} にあり、この地域にない |`,
    '| --- | ---: | --- | --- | ---: | --- | --- |',
    ...panels.map((panels) => row(reference, panels)),
    '',
  ].join('\n')
}

export type { RegionPanels, ReportInput }

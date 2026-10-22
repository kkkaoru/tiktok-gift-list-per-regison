// Runs with bun.
// Fetches each region's own TikTok LIVE gift panel (no stream, gift names in the region's
// language) through the API Gateway of that region, and optionally one live's panel in JP
// (src/cli/deploy.sh writes .relay/outputs.json and .relay/api-key). Writes results/<date in Japan>/ (rebuilt each run):
//   regions/<REGION>.json  the region's gift panel (giftId, name, coins, image URL, panel order)
//   rooms/<user>.json      the live's gift panel in JP (only with a live given)
//   images/*.png           atlases of each panel and of the gifts each region has that JP lacks
//   README.md              the comparison against JP (by giftId)
//   bun src/cli/fetch-regions.ts [@user | live URL | room id]
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { parseEndpoints, REGIONS } from '../regions/regions'
import type { Region } from '../regions/regions'
import { atlasPaths, reportMarkdown, resultDate, roomAtlasPath, roomName } from '../report/report'
import type { RegionPanel, RoomPanel } from '../report/report'
import {
  gatewayUrl,
  giftListUrl,
  panelGifts,
  parseTikTokSource,
  roomIdOf,
  roomLookupUrl,
} from '../tiktok/tiktok'
import { diffPanels } from '../tiktok/tiktok'
import type { TikTokGift, TikTokSource } from '../tiktok/tiktok'
import { initCodecs, loadImages, writeAtlases } from './images'
import type { AtlasFile } from './images'

interface Gateway {
  readonly apiKey: string
  readonly endpoint: string
}

interface PanelQuery {
  readonly gateway: Gateway
  readonly language: string
  readonly roomId: string | null
}

interface AtlasSet {
  readonly base: RegionPanel
  readonly regions: readonly RegionPanel[]
  readonly room: RoomPanel | null
}

interface Written {
  readonly fetchedAt: string
  readonly folder: string
  readonly regions: readonly RegionPanel[]
  readonly room: RoomPanel | null
}

const ROOT: string = join(import.meta.dir, '../..')
const OUTPUTS: string = join(ROOT, '.relay/outputs.json')
const API_KEY: string = join(ROOT, '.relay/api-key')
const BASE: string = 'JP'
// Atlas columns: whole panels, and the (shorter) differences.
const PANEL_COLUMNS: number = 24
const DIFF_COLUMNS: number = 12
const USER_AGENT: string =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36'

const baseRegion = (): Region => {
  const region = REGIONS.find((entry) => entry.label === BASE)
  if (region === undefined) {
    throw new Error(`No ${BASE} in src/regions/regions.ts`)
  }
  return region
}

const json = async ({ apiKey, endpoint }: Gateway, url: string): Promise<unknown> => {
  const response = await fetch(gatewayUrl(endpoint, url), {
    headers: { 'user-agent': USER_AGENT, 'x-api-key': apiKey },
  })
  if (!response.ok) {
    throw new Error(`Gateway answered HTTP ${response.status} for ${new URL(url).pathname}`)
  }
  return response.json()
}

const panel = async ({ gateway, language, roomId }: PanelQuery): Promise<readonly TikTokGift[]> =>
  panelGifts(await json(gateway, giftListUrl({ language, roomId })))

const gatewayOf = (gateways: ReadonlyMap<string, Gateway>, label: string): Gateway => {
  const gateway = gateways.get(label)
  if (gateway === undefined) {
    throw new Error(`No ${label} gateway; run src/cli/deploy.sh first.`)
  }
  return gateway
}

const gateways = async (): Promise<ReadonlyMap<string, Gateway>> => {
  const [outputs, apiKey] = await Promise.all([
    readFile(OUTPUTS, 'utf8'),
    readFile(API_KEY, 'utf8'),
  ])
  return new Map(
    [...parseEndpoints(JSON.parse(outputs))].map(([label, endpoint]) => [
      label,
      { apiKey: apiKey.trim(), endpoint },
    ]),
  )
}

const regionPanel = async (
  all: ReadonlyMap<string, Gateway>,
  { awsRegion, label, language }: Region,
): Promise<RegionPanel> => ({
  awsRegion,
  gifts: await panel({ gateway: gatewayOf(all, label), language, roomId: null }),
  label,
  language,
})

const roomIdFor = async (source: TikTokSource, gateway: Gateway): Promise<string> => {
  const roomId =
    'roomId' in source
      ? source.roomId
      : roomIdOf(await json(gateway, roomLookupUrl(source.uniqueId)))
  if (roomId === null) {
    throw new Error('That user has no live room right now; pass a room id instead.')
  }
  return roomId
}

// The live's panel in the base region (its own gifts plus the region's).
const roomPanel = async (input: string, gateway: Gateway): Promise<RoomPanel> => {
  const source = parseTikTokSource(input)
  if (source === null) {
    throw new Error('Usage: bun src/cli/fetch-regions.ts [@user | live URL | room id]')
  }
  const roomId = await roomIdFor(source, gateway)
  return {
    gifts: await panel({ gateway, language: baseRegion().language, roomId }),
    roomId,
    source: input,
  }
}

const regionAtlases = (base: RegionPanel, panel: RegionPanel): readonly AtlasFile[] => {
  const { added } = diffPanels(base.gifts, panel.gifts)
  const paths = atlasPaths(panel.label)
  return [
    { columns: PANEL_COLUMNS, gifts: panel.gifts, path: paths.all },
    { columns: DIFF_COLUMNS, gifts: added, path: paths.added },
  ]
}

const roomAtlases = (base: RegionPanel, room: RoomPanel | null): readonly AtlasFile[] => {
  if (room === null) {
    return []
  }
  const { added } = diffPanels(base.gifts, room.gifts)
  const name = roomName(room)
  return [
    { columns: PANEL_COLUMNS, gifts: room.gifts, path: roomAtlasPath(name) },
    { columns: DIFF_COLUMNS, gifts: added, path: roomAtlasPath(`${name}-added`) },
  ]
}

// Every atlas of the report, with paths relative to the results folder.
const atlases = ({ base, regions, room }: AtlasSet): readonly AtlasFile[] => [
  ...regions.flatMap((panel) => regionAtlases(base, panel)),
  ...roomAtlases(base, room),
]

const writeImages = async (folder: string, set: AtlasSet): Promise<void> => {
  const files = atlases(set).map((file) => ({ ...file, path: join(folder, file.path) }))
  await initCodecs()
  const images = await loadImages(files.flatMap((file) => file.gifts.map((gift) => gift.imageUrl)))
  await writeAtlases(files, images)
}

// The folder is rebuilt: a second fetch the same day must not leave the first one's files
// (e.g. a live's JSON and images, or a diff image now empty) next to the new report.
const write = async ({ fetchedAt, folder, regions, room }: Written): Promise<void> => {
  const base = regions.find((panel) => panel.label === BASE)
  if (base === undefined) {
    throw new Error(`No panel for the base region ${BASE}`)
  }
  await rm(folder, { force: true, recursive: true })
  await Promise.all(
    ['regions', 'rooms', 'images'].map((sub) => mkdir(join(folder, sub), { recursive: true })),
  )
  await Promise.all([
    ...regions.map((panel) =>
      writeFile(
        join(folder, 'regions', `${panel.label}.json`),
        `${JSON.stringify({ fetchedAt, ...panel }, null, 2)}\n`,
      ),
    ),
    ...(room === null
      ? []
      : [
          writeFile(
            join(folder, 'rooms', `${roomName(room)}.json`),
            `${JSON.stringify({ fetchedAt, label: BASE, ...room }, null, 2)}\n`,
          ),
        ]),
    writeFile(join(folder, 'README.md'), reportMarkdown({ base: BASE, fetchedAt, regions, room })),
  ])
  await writeImages(folder, { base, regions, room })
}

const main = async (input: string | undefined): Promise<void> => {
  const all = await gateways()
  const [regions, room] = await Promise.all([
    Promise.all(REGIONS.map((region) => regionPanel(all, region))),
    input === undefined ? null : roomPanel(input, gatewayOf(all, BASE)),
  ])
  const fetchedAt = new Date().toISOString()
  await write({ fetchedAt, folder: join(ROOT, 'results', resultDate(fetchedAt)), regions, room })
  console.info(
    JSON.stringify({
      regions: Object.fromEntries(regions.map((panel) => [panel.label, panel.gifts.length])),
      room: room?.gifts.length ?? null,
    }),
  )
}

await main(process.argv[2])

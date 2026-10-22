// Runs with bun.
// Fetches the gift panel of one TikTok live through the API Gateway of every region
// (src/cli/deploy.sh writes .relay/outputs.json and .relay/api-key) and writes
// results/<date>/<user or room>/:
//   <REGION>.json  the panel inside the room and the region's default panel (giftId, name, coins,
//                  image URL, in panel order)
//   README.md      the comparison against JP
//   bun src/cli/fetch-regions.ts <@user | live URL | room id>
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { parseEndpoints, REGIONS } from '../regions/regions'
import { reportMarkdown } from '../report/report'
import type { RegionPanels } from '../report/report'
import {
  gatewayUrl,
  giftListUrl,
  panelGifts,
  parseTikTokSource,
  roomIdOf,
  roomLookupUrl,
} from '../tiktok/tiktok'
import type { TikTokSource } from '../tiktok/tiktok'

interface Gateway {
  readonly apiKey: string
  readonly endpoint: string
}

interface RegionFetch {
  readonly gateway: Gateway
  readonly label: string
  readonly roomId: string
}

const ROOT: string = join(import.meta.dir, '../..')
const OUTPUTS: string = join(ROOT, '.relay/outputs.json')
const API_KEY: string = join(ROOT, '.relay/api-key')
const BASE: string = 'JP'
// Gift names in Japanese; the gift set itself follows the region of the gateway's IP.
const LANGUAGE: string = 'ja-JP'
const USER_AGENT: string =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36'

const json = async ({ apiKey, endpoint }: Gateway, url: string): Promise<unknown> => {
  const response = await fetch(gatewayUrl(endpoint, url), {
    headers: { 'user-agent': USER_AGENT, 'x-api-key': apiKey },
  })
  if (!response.ok) {
    throw new Error(`Gateway answered HTTP ${response.status} for ${new URL(url).pathname}`)
  }
  return response.json()
}

const roomOf = async (source: TikTokSource, gateway: Gateway): Promise<string> => {
  const roomId =
    'roomId' in source
      ? source.roomId
      : roomIdOf(await json(gateway, roomLookupUrl(source.uniqueId)))
  if (roomId === null) {
    throw new Error('That user has no live room right now; pass a room id instead.')
  }
  return roomId
}

const panelsOf = async ({ gateway, label, roomId }: RegionFetch): Promise<RegionPanels> => {
  const [room, region] = await Promise.all(
    [roomId, null].map(async (id) =>
      panelGifts(await json(gateway, giftListUrl({ language: LANGUAGE, roomId: id }))),
    ),
  )
  return { label, region: region ?? [], room: room ?? [] }
}

const folderName = (source: TikTokSource): string =>
  'roomId' in source ? `room-${source.roomId}` : source.uniqueId

const gateways = async (): Promise<ReadonlyMap<string, Gateway>> => {
  const [outputs, apiKey] = await Promise.all([
    readFile(OUTPUTS, 'utf8'),
    readFile(API_KEY, 'utf8'),
  ])
  const endpoints = parseEndpoints(JSON.parse(outputs))
  if (endpoints.size !== REGIONS.length) {
    throw new Error('Not every region has a gateway; run src/cli/deploy.sh first.')
  }
  return new Map(
    [...endpoints].map(([label, endpoint]) => [label, { apiKey: apiKey.trim(), endpoint }]),
  )
}

const main = async (input: string | undefined): Promise<void> => {
  const source = parseTikTokSource(input ?? '')
  if (source === null || input === undefined) {
    throw new Error('Usage: bun src/cli/fetch-regions.ts <@user | live URL | room id>')
  }
  const all = await gateways()
  const base = all.get(BASE)
  if (base === undefined) {
    throw new Error(`No ${BASE} gateway`)
  }
  const roomId = await roomOf(source, base)
  const panels = await Promise.all(
    [...all].map(([label, gateway]) => panelsOf({ gateway, label, roomId })),
  )
  const fetchedAt = new Date().toISOString()
  const folder = join(ROOT, 'results', fetchedAt.slice(0, 10), folderName(source))
  await mkdir(folder, { recursive: true })
  await Promise.all([
    ...panels.map((panel) =>
      writeFile(
        join(folder, `${panel.label}.json`),
        `${JSON.stringify({ fetchedAt, ...panel, roomId }, null, 2)}\n`,
      ),
    ),
    writeFile(
      join(folder, 'README.md'),
      reportMarkdown({ base: BASE, fetchedAt, panels, roomId, source: input }),
    ),
  ])
  console.info(
    JSON.stringify(
      Object.fromEntries(
        panels.map((panel) => [panel.label, [panel.room.length, panel.region.length]]),
      ),
    ),
  )
}

await main(process.argv[2])

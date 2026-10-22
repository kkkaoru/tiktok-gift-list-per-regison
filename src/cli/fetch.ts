// Runs with bun.
// Reads Japan's TikTok LIVE gift list signed out (through the Tokyo API Gateway; src/cli/deploy.sh
// writes .relay/outputs.json and .relay/api-key) and signed in (with the session cookie, from this
// machine: only that list carries is_displayed_on_panel), for the given live's room or, without
// one, for no live. Rebuilds results/<date in Japan>/:
//   live/ or no-live/ anonymous.json + .png (the signed-out list), signed-in.json + .png (the
//                     gifts the live screen shows), hidden.png (signed-out gifts it does not show),
//                     shown.csv / hidden.csv / signed-in-only.csv (the lists the report links);
//                     atlases and CSVs by coins ascending, the JSON in panel order
//   README.md         the comparisons (src/report/report.ts)
//   read -r TIKTOK_SESSIONID < private/tiktok-sessionid.secret; export TIKTOK_SESSIONID
//   bun src/cli/fetch.ts [@user | live URL | room id]
// The session comes only from the environment, goes only to TikTok, and is never printed or saved.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { parseEndpoints, REGIONS } from '../regions/regions'
import {
  byCoins,
  comparisonPaths,
  giftCsv,
  hiddenGifts,
  NAME_LANGUAGE,
  reportMarkdown,
  resultDate,
  signedInOnly,
} from '../report/report'
import type { Comparison, LiveRoom } from '../report/report'
import {
  displayedGifts,
  gatewayUrl,
  giftListUrl,
  panelGifts,
  parseTikTokSource,
  roomIdOf,
  roomLookupUrl,
  sessionCookie,
} from '../tiktok/tiktok'
import { initCodecs, loadImages, writeAtlases } from './images'

interface Gateway {
  readonly apiKey: string
  readonly endpoint: string
}

interface Request {
  readonly headers: Readonly<Record<string, string>>
  readonly url: string
}

const ROOT: string = join(import.meta.dir, '../..')
const OUTPUTS: string = join(ROOT, '.relay/outputs.json')
const API_KEY: string = join(ROOT, '.relay/api-key')
const LABEL: string = 'JP'
const COLUMNS: number = 24
const USER_AGENT: string =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36'
// The gift list for the live's room, or without a live (then it depends on no stream).
const giftList = (live: LiveRoom | null): string =>
  giftListUrl({ language: NAME_LANGUAGE, roomId: live?.roomId ?? null })

const json = async ({ headers, url }: Request): Promise<unknown> => {
  const response = await fetch(url, { headers: { 'user-agent': USER_AGENT, ...headers } })
  if (!response.ok) {
    // Never echo the URL or headers: they hold the gateway, its key or the session.
    throw new Error(`HTTP ${response.status} for the gift list`)
  }
  return response.json()
}

const tokyoGateway = async (): Promise<Gateway> => {
  const [outputs, apiKey] = await Promise.all([
    readFile(OUTPUTS, 'utf8'),
    readFile(API_KEY, 'utf8'),
  ])
  const endpoint = parseEndpoints(JSON.parse(outputs)).get(LABEL)
  if (endpoint === undefined) {
    throw new Error(`No ${LABEL} gateway; run src/cli/deploy.sh first.`)
  }
  return { apiKey: apiKey.trim(), endpoint }
}

const through = ({ apiKey, endpoint }: Gateway, url: string): Request => ({
  headers: { 'x-api-key': apiKey },
  url: gatewayUrl(endpoint, url),
})

// The live's room, looked up signed out through the gateway when a user is given.
const liveRoom = async (input: string | undefined, gateway: Gateway): Promise<LiveRoom | null> => {
  if (input === undefined) {
    return null
  }
  const source = parseTikTokSource(input)
  if (source === null) {
    throw new Error('Usage: bun src/cli/fetch.ts [@user | live URL | room id]')
  }
  if ('roomId' in source) {
    return { roomId: source.roomId, url: null }
  }
  const roomId = roomIdOf(await json(through(gateway, roomLookupUrl(source.uniqueId))))
  if (roomId === null) {
    throw new Error('That user has no live room right now.')
  }
  return { roomId, url: `https://www.tiktok.com/@${source.uniqueId}/live` }
}

const signedIn = (live: LiveRoom | null): Request => {
  const cookie = sessionCookie(process.env['TIKTOK_SESSIONID'])
  if (cookie === null) {
    throw new Error(
      'Set TIKTOK_SESSIONID (32 hex digits) from a private file: read -r TIKTOK_SESSIONID < private/tiktok-sessionid.secret; export TIKTOK_SESSIONID',
    )
  }
  return { headers: { cookie }, url: giftList(live) }
}

const awsRegion = (): string => REGIONS.find((region) => region.label === LABEL)?.awsRegion ?? LABEL

const compare = async (gateway: Gateway, live: LiveRoom | null): Promise<Comparison> => {
  const [anonymousBody, signedInBody] = await Promise.all([
    json(through(gateway, giftList(live))),
    json(signedIn(live)),
  ])
  const shown = displayedGifts(signedInBody)
  if (shown.length === 0) {
    throw new Error('No gift is flagged for the live screen: TikTok did not accept the session.')
  }
  const fetchedAt = new Date().toISOString()
  return {
    anonymous: { awsRegion: awsRegion(), fetchedAt, gifts: panelGifts(anonymousBody) },
    live,
    signedIn: { fetchedAt, gifts: shown, listed: panelGifts(signedInBody).length },
  }
}

// The given live's lists, or the lists without a live when none is given.
const read = async (input: string | undefined): Promise<readonly Comparison[]> => {
  const gateway = await tokyoGateway()
  return [await compare(gateway, await liveRoom(input, gateway))]
}

const saved = (fetchedAt: string, data: object): string =>
  `${JSON.stringify({ fetchedAt, label: LABEL, language: NAME_LANGUAGE, ...data }, null, 2)}\n`

const writeComparison = async (folder: string, comparison: Comparison): Promise<void> => {
  const { anonymous, live, signedIn: shown } = comparison
  const paths = comparisonPaths(live)
  await mkdir(join(folder, paths.anonymousJson, '..'), { recursive: true })
  await Promise.all([
    writeFile(
      join(folder, paths.anonymousJson),
      saved(anonymous.fetchedAt, { awsRegion: anonymous.awsRegion, gifts: anonymous.gifts, live }),
    ),
    writeFile(
      join(folder, paths.signedInJson),
      saved(shown.fetchedAt, { gifts: shown.gifts, listed: shown.listed, live }),
    ),
    writeFile(join(folder, paths.shownCsv), giftCsv(byCoins(shown.gifts))),
    writeFile(join(folder, paths.hiddenCsv), giftCsv(byCoins(hiddenGifts(comparison)))),
    writeFile(join(folder, paths.signedInOnlyCsv), giftCsv(byCoins(signedInOnly(comparison)))),
  ])
  await writeAtlases(
    [
      {
        columns: COLUMNS,
        gifts: byCoins(anonymous.gifts),
        path: join(folder, paths.anonymousAtlas),
      },
      { columns: COLUMNS, gifts: byCoins(shown.gifts), path: join(folder, paths.signedInAtlas) },
      {
        columns: COLUMNS,
        gifts: byCoins(hiddenGifts(comparison)),
        path: join(folder, paths.hiddenAtlas),
      },
    ],
    await loadImages([...anonymous.gifts, ...shown.gifts].map((gift) => gift.imageUrl)),
  )
}

const write = async (folder: string, comparisons: readonly Comparison[]): Promise<void> => {
  await rm(folder, { force: true, recursive: true })
  await mkdir(folder, { recursive: true })
  await initCodecs()
  await Promise.all(comparisons.map((comparison) => writeComparison(folder, comparison)))
  await writeFile(join(folder, 'README.md'), reportMarkdown({ comparisons }))
}

const main = async (): Promise<void> => {
  const comparisons = await read(process.argv[2])
  const first = comparisons[0]
  if (first === undefined) {
    throw new Error('Nothing was read')
  }
  await write(join(ROOT, 'results', resultDate(first.anonymous.fetchedAt)), comparisons)
  console.info(
    JSON.stringify(
      comparisons.map((comparison) => ({
        anonymous: comparison.anonymous.gifts.length,
        hidden: hiddenGifts(comparison).length,
        live: comparison.live !== null,
        shown: comparison.signedIn.gifts.length,
        signedInListed: comparison.signedIn.listed,
      })),
    ),
  )
}

await main()

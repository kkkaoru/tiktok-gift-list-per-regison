// Runs with bun.
// Gift images for the atlases: downloaded once from TikTok's image CDN into .cache/images
// (gitignored; the images are the same from every region), decoded (WebP / PNG), and atlases
// written as PNG.
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import decodePng, { init as initPngDecoder } from '@jsquash/png/decode.js'
import encodePng, { init as initPngEncoder } from '@jsquash/png/encode.js'
import decodeWebp, { init as initWebpDecoder } from '@jsquash/webp/decode.js'

import { gridAtlas } from '../atlas/atlas'
import type { Rgba } from '../atlas/atlas'
import type { TikTokGift } from '../tiktok/tiktok'

interface AtlasFile {
  readonly columns: number
  readonly gifts: readonly TikTokGift[]
  readonly path: string
}

const ROOT: string = join(import.meta.dir, '../..')
const CACHE: string = join(ROOT, '.cache/images')
const CODECS: URL = new URL('../../node_modules/@jsquash/', import.meta.url)
const CELL: number = 64
const PARALLEL: number = 16
const MAX_BYTES: number = 4 * 1024 * 1024
const WEBP: readonly number[] = [0x57, 0x45, 0x42, 0x50]
const PNG: readonly number[] = [0x89, 0x50, 0x4e, 0x47]

export const initCodecs = async (): Promise<void> => {
  const [png, webp] = await Promise.all(
    ['png/codec/pkg/squoosh_png_bg.wasm', 'webp/codec/dec/webp_dec.wasm'].map(async (path) =>
      WebAssembly.compile(await readFile(new URL(path, CODECS))),
    ),
  )
  await Promise.all([initPngDecoder(png), initPngEncoder(png), initWebpDecoder(webp)])
}

const startsWith = (bytes: Uint8Array, offset: number, magic: readonly number[]): boolean =>
  magic.every((byte, index) => bytes[offset + index] === byte)

const cached = async (url: string): Promise<Uint8Array<ArrayBuffer>> => {
  const file = join(CACHE, createHash('sha256').update(url).digest('hex'))
  try {
    return new Uint8Array(await readFile(file))
  } catch {
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15_000) })
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (!response.ok || bytes.length > MAX_BYTES) {
      throw new Error(`Image download failed: HTTP ${response.status}, ${bytes.length} bytes`)
    }
    await writeFile(file, bytes)
    return bytes
  }
}

const decode = async (bytes: Uint8Array<ArrayBuffer>): Promise<Rgba> => {
  const isWebp = startsWith(bytes, 8, WEBP)
  if (!isWebp && !startsWith(bytes, 0, PNG)) {
    throw new Error('Not a WebP or PNG gift image')
  }
  const image = await (isWebp ? decodeWebp(bytes.buffer) : decodePng(bytes.buffer))
  return { data: image.data, height: image.height, width: image.width }
}

const load = async (url: string): Promise<Rgba | null> => {
  try {
    return await decode(await cached(url))
  } catch {
    return null
  }
}

const chunks = <T>(items: readonly T[]): readonly (readonly T[])[] =>
  Array.from({ length: Math.ceil(items.length / PARALLEL) }, (_, index) =>
    items.slice(index * PARALLEL, (index + 1) * PARALLEL),
  )

// url -> decoded image (null when it failed), a few downloads at a time.
export const loadImages = async (
  urls: readonly string[],
): Promise<ReadonlyMap<string, Rgba | null>> => {
  await mkdir(CACHE, { recursive: true })
  const unique = [...new Set(urls)]
  const images = await chunks(unique).reduce<Promise<readonly (Rgba | null)[]>>(
    async (done, chunk) => [...(await done), ...(await Promise.all(chunk.map(load)))],
    Promise.resolve([]),
  )
  return new Map(unique.map((url, index) => [url, images[index] ?? null]))
}

// One atlas PNG per file; an empty gift list writes nothing.
export const writeAtlases = async (
  files: readonly AtlasFile[],
  images: ReadonlyMap<string, Rgba | null>,
): Promise<void> => {
  await Promise.all(
    files
      .filter((file) => file.gifts.length > 0)
      .map(async ({ columns, gifts, path }) => {
        const atlas = gridAtlas({
          cell: CELL,
          columns: Math.min(columns, gifts.length),
          images: gifts.map((gift) => images.get(gift.imageUrl) ?? null),
        })
        await writeFile(path, new Uint8Array(await encodePng({ colorSpace: 'srgb', ...atlas })))
      }),
  )
}

export type { AtlasFile }

// Runs with bun.
// Gift images into one grid image (an atlas): each image shrunk to fit a square cell (area
// average, premultiplied alpha, aspect kept, centred), cells left to right then top to bottom in
// the given order, so cell n of the atlas is row n of the report's table.
interface Rgba {
  readonly data: Uint8ClampedArray
  readonly height: number
  readonly width: number
}

interface GridInput {
  readonly cell: number
  readonly columns: number
  // null: an image that could not be loaded (left empty).
  readonly images: readonly (Rgba | null)[]
}

const CHANNELS: number = 4

const range = (length: number): readonly number[] => Array.from({ length }, (_, index) => index)

export const blank = (width: number, height: number): Rgba => ({
  data: new Uint8ClampedArray(width * height * CHANNELS),
  height,
  width,
})

// Area-average of the source pixels under one target pixel, in premultiplied alpha so clear
// pixels do not darken the edges.
const averaged = (image: Rgba, scale: number, x: number, y: number): readonly number[] => {
  const xs = range(Math.max(Math.ceil(scale), 1)).map((dx) =>
    Math.min(Math.floor(x * scale) + dx, image.width - 1),
  )
  const ys = range(Math.max(Math.ceil(scale), 1)).map((dy) =>
    Math.min(Math.floor(y * scale) + dy, image.height - 1),
  )
  const samples = ys.flatMap((sy) => xs.map((sx) => (sy * image.width + sx) * CHANNELS))
  // Sample offsets are inside the image, so every read is a byte.
  const byte = (at: number): number => Number(image.data[at])
  const alpha = samples.reduce((sum, at) => sum + byte(at + 3), 0)
  const colour = (channel: number): number =>
    alpha === 0
      ? 0
      : samples.reduce((sum, at) => sum + byte(at + channel) * byte(at + 3), 0) / alpha
  return [colour(0), colour(1), colour(2), alpha / samples.length]
}

// The image shrunk (never enlarged) to fit cell x cell, centred on a clear cell.
export const fitCell = (image: Rgba, cell: number): Rgba => {
  const scale = Math.max(image.width / cell, image.height / cell, 1)
  const width = Math.max(Math.round(image.width / scale), 1)
  const height = Math.max(Math.round(image.height / scale), 1)
  const left = Math.floor((cell - width) / 2)
  const top = Math.floor((cell - height) / 2)
  const out = blank(cell, cell)
  range(height).map((y) =>
    range(width).map((x) =>
      out.data.set(averaged(image, scale, x, y), ((top + y) * cell + left + x) * CHANNELS),
    ),
  )
  return out
}

const paste = (target: Rgba, image: Rgba, left: number, top: number): void =>
  range(image.height).forEach((y) =>
    target.data.set(
      image.data.subarray(y * image.width * CHANNELS, (y + 1) * image.width * CHANNELS),
      ((top + y) * target.width + left) * CHANNELS,
    ),
  )

export const gridAtlas = ({ cell, columns, images }: GridInput): Rgba => {
  const rows = Math.max(Math.ceil(images.length / columns), 1)
  const atlas = blank(columns * cell, rows * cell)
  images.forEach((image, index) =>
    image === null
      ? undefined
      : paste(
          atlas,
          fitCell(image, cell),
          (index % columns) * cell,
          Math.floor(index / columns) * cell,
        ),
  )
  return atlas
}

export type { GridInput, Rgba }

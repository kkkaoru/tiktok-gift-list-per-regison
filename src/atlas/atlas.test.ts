// Runs with bun.
import { expect, test } from 'vitest'

import { blank, fitCell, gridAtlas } from './atlas'

const solid = (
  width: number,
  height: number,
  rgba: readonly number[],
): ReturnType<typeof blank> => ({
  data: new Uint8ClampedArray(Array.from({ length: width * height }, () => rgba).flat()),
  height,
  width,
})

test('makes a clear image', () => {
  expect(blank(1, 2)).toStrictEqual({ data: new Uint8ClampedArray(8), height: 2, width: 1 })
})

test('shrinks a wide image into the cell, centred', () => {
  expect([...fitCell(solid(4, 2, [200, 0, 0, 255]), 2).data]).toStrictEqual([
    200, 0, 0, 255, 200, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0,
  ])
})

test('never enlarges a small image', () => {
  expect([...fitCell(solid(1, 1, [0, 0, 9, 255]), 3).data]).toStrictEqual([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
  ])
})

test('averages in premultiplied alpha so clear pixels keep the colour', () => {
  const image = {
    data: new Uint8ClampedArray([100, 0, 0, 255, 0, 0, 0, 0]),
    height: 1,
    width: 2,
  }
  expect([...fitCell(image, 1).data]).toStrictEqual([100, 0, 0, 128])
  expect([...fitCell(solid(2, 1, [5, 5, 5, 0]), 1).data]).toStrictEqual([0, 0, 0, 0])
})

test('fills cells left to right, then the next row, skipping missing images', () => {
  const atlas = gridAtlas({
    cell: 1,
    columns: 2,
    images: [solid(1, 1, [1, 1, 1, 255]), null, solid(1, 1, [3, 3, 3, 255])],
  })
  expect([atlas.width, atlas.height, [...atlas.data]]).toStrictEqual([
    2,
    2,
    [1, 1, 1, 255, 0, 0, 0, 0, 3, 3, 3, 255, 0, 0, 0, 0],
  ])
  expect([gridAtlas({ cell: 2, columns: 3, images: [] }).width]).toStrictEqual([6])
})

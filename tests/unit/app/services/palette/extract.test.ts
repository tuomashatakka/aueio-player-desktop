import { describe, expect, test } from 'bun:test'
import { extractPalette } from '../../../../../src/app/services/palette/extract'
import type { ImageDataLike } from '../../../../../src/app/services/palette/extract'


function fixture (pixels: readonly (readonly [number, number, number, number])[]): ImageDataLike {
  const data = new Uint8ClampedArray(pixels.length * 4)

  pixels.forEach(([ r, g, b, a ], i) => {
    data[i * 4]     = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = a
  })

  return { data, width: 2, height: Math.ceil(pixels.length / 2) }
}

describe('extractPalette', () => {
  test('reads roles off a 2x2 fixture (red, green, blue, black)', () => {
    const image = fixture([
      [ 255, 0, 0, 255 ],
      [ 0, 255, 0, 255 ],
      [ 0, 0, 255, 255 ],
      [ 0, 0, 0, 255 ],
    ])

    const palette = extractPalette(image)

    expect(palette).not.toBeNull()
    // The three saturated primaries out-populate the fourth (black) sample,
    // so the roles are drawn from them, not from black.
    expect(palette!.vibrant).toBe('rgb(0 255 0)')
    expect(palette!.dark).toBe('rgb(0 0 255)')
    expect(palette!.light).toBe('rgb(0 255 0)')
    expect(palette!.lum).toBeGreaterThan(0)
    expect(palette!.lum).toBeLessThan(1)
  })

  test('a fully transparent image yields null', () => {
    const image = fixture([
      [ 10, 10, 10, 0 ],
      [ 20, 20, 20, 0 ],
      [ 30, 30, 30, 0 ],
      [ 40, 40, 40, 0 ],
    ])

    expect(extractPalette(image)).toBeNull()
  })

  test('a monochrome image still returns roles (falls back to the raw ranking)', () => {
    const image = fixture([
      [ 10, 10, 10, 255 ],
      [ 60, 60, 60, 255 ],
      [ 120, 120, 120, 255 ],
      [ 200, 200, 200, 255 ],
    ])

    const palette = extractPalette(image)
    expect(palette).not.toBeNull()
    expect(palette!.dark).toBe('rgb(10 10 10)')
    expect(palette!.light).toBe('rgb(200 200 200)')
  })
})

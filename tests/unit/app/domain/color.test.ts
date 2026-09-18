import { describe, expect, test } from 'bun:test'
import { ACCENT_CONTRAST_TARGET, contrastLift, contrastRatio, parseColor } from '../../../../src/app/domain'
import type { Rgb } from '../../../../src/app/domain'


const DARK_BG:  Rgb = [ 15, 15, 17 ]
const LIGHT_BG: Rgb = [ 245, 245, 245 ]

describe('parseColor', () => {
  test('parses #rgb and #rrggbb', () => {
    expect(parseColor('#fff')).toEqual([ 255, 255, 255 ])
    expect(parseColor('#00e5d1')).toEqual([ 0, 229, 209 ])
  })

  test('parses rgb()/rgba() in both comma and space form', () => {
    expect(parseColor('rgb(1, 2, 3)')).toEqual([ 1, 2, 3 ])
    expect(parseColor('rgb(1 2 3 / 0.5)')).toEqual([ 1, 2, 3 ])
  })

  test('returns null for color-mix() and other unrecognised forms', () => {
    expect(parseColor('color-mix(in srgb, red, blue)')).toBeNull()
    expect(parseColor('not a color')).toBeNull()
  })
})

describe('contrastLift', () => {
  test('leaves an already-legible colour untouched', () => {
    const white: Rgb = [ 255, 255, 255 ]
    expect(contrastLift(white, DARK_BG)).toEqual(white)
  })

  test('lifts a low-contrast colour until it clears the target ratio, against a dark background', () => {
    const midGrey: Rgb = [ 60, 60, 60 ]
    const lifted       = contrastLift(midGrey, DARK_BG)
    expect(contrastRatio(lifted, DARK_BG)).toBeGreaterThanOrEqual(ACCENT_CONTRAST_TARGET)
  })

  test('lifts toward black, not white, against a light background', () => {
    const midGrey: Rgb = [ 200, 200, 200 ]
    const lifted       = contrastLift(midGrey, LIGHT_BG)
    expect(contrastRatio(lifted, LIGHT_BG)).toBeGreaterThanOrEqual(ACCENT_CONTRAST_TARGET)
    expect(lifted[0]).toBeLessThan(midGrey[0])
  })

  test('reaches at least the 3:1 floor for a range of starting colours', () => {
    const starts: Rgb[] = [[ 20, 20, 22 ], [ 50, 10, 10 ], [ 10, 50, 10 ], [ 10, 10, 50 ], [ 30, 30, 30 ]]

    for (const colour of starts)
      expect(contrastRatio(contrastLift(colour, DARK_BG), DARK_BG)).toBeGreaterThanOrEqual(3)
  })
})

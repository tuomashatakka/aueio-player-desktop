import { describe, expect, test } from 'bun:test'
import { DEFAULT_SETTINGS, normalizeSettings } from '../../../src/shared/settings'


describe('normalizeSettings', () => {
  test('round-trips the defaults', () => {
    expect(normalizeSettings(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS)
  })

  test('garbage input falls back to defaults', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings('not an object')).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings(42)).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS)
  })

  test('clamps out-of-range numbers', () => {
    const result = normalizeSettings({
      fontScale: 99,
      volume:    -5,
      dsp:       { eq: { on:    true,
        gains: Array.from({ length: 10 }, () =>
          0) },
      limiter: { on: true, threshold: -100, release: 100000 }},
    })

    expect(result.fontScale).toBe(1.4)
    expect(result.volume).toBe(0)
    expect(result.dsp.limiter.threshold).toBe(-24)
    expect(result.dsp.limiter.release).toBe(1000)
  })

  test('clamps fontScale below the minimum', () => {
    expect(normalizeSettings({ fontScale: 0.1 }).fontScale).toBe(0.8)
  })

  test('rejects unknown enum values', () => {
    const result = normalizeSettings({ theme: 'nonsense', repeat: 'nonsense', accentSource: 'nonsense' })

    expect(result.theme).toBe(DEFAULT_SETTINGS.theme)
    expect(result.repeat).toBe(DEFAULT_SETTINGS.repeat)
    expect(result.accentSource).toBe(DEFAULT_SETTINGS.accentSource)
  })

  test('wrong-length eq gains normalize to 10 zeros', () => {
    const tooFew  = normalizeSettings({ dsp: { eq: { on: true, gains: [ 1, 2, 3 ]}}})
    const tooMany = normalizeSettings({ dsp: { eq: { on:    true,
      gains: Array.from({ length: 20 }, () =>
        5) }}})

    expect(tooFew.dsp.eq.gains).toEqual(Array.from({ length: 10 }, () =>
      0))
    expect(tooMany.dsp.eq.gains).toEqual(Array.from({ length: 10 }, () =>
      0))
  })

  test('preserves valid eq gains of the right length', () => {
    const gains  = [ 1, -2, 3, -4, 5, -6, 7, -8, 9, -10 ]
    const result = normalizeSettings({ dsp: { eq: { on: true, gains }}})

    expect(result.dsp.eq.gains).toEqual(gains)
    expect(result.dsp.eq.on).toBe(true)
  })

  test('normalizes expandedSize with fallbacks', () => {
    expect(normalizeSettings({ expandedSize: { width: 10, height: 10 }}).expandedSize).toEqual({ width: 480, height: 320 })
    expect(normalizeSettings({}).expandedSize).toEqual(DEFAULT_SETTINGS.expandedSize)
  })

  test('filters non-string roots', () => {
    expect(normalizeSettings({ roots: [ '/a', 1, null, '/b' ]}).roots).toEqual([ '/a', '/b' ])
    expect(normalizeSettings({ roots: 'not an array' }).roots).toEqual([])
  })
})

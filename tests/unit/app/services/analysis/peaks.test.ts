import { describe, expect, test } from 'bun:test'
import { computePeaks } from '../../../../../src/app/services/analysis/peaks'


describe('computePeaks', () => {
  test('returns exactly `bars` values, normalised to [0.07, 1]', () => {
    const mono = new Float32Array(44_100)
    for (let i = 0; i < mono.length; i++)
      mono[i] = Math.sin(2 * Math.PI * 440 * i / 44_100) * (i < mono.length / 2 ? 1 : 0.1)

    const bars = computePeaks(mono, 200)

    expect(bars).toHaveLength(200)
    for (const value of bars) {
      expect(value).toBeGreaterThanOrEqual(0.07)
      expect(value).toBeLessThanOrEqual(1)
    }

    // The loud first half should peak higher than the quiet second half.
    const firstHalfMax  = Math.max(...bars.slice(0, 90))
    const secondHalfMax = Math.max(...bars.slice(110))
    expect(firstHalfMax).toBeGreaterThan(secondHalfMax)
  })

  test('defaults to 400 bars', () => {
    expect(computePeaks(new Float32Array(4000))).toHaveLength(400)
  })

  test('handles silence and empty input without dividing by zero', () => {
    for (const value of computePeaks(new Float32Array(1000), 10))
      expect(value).toBeCloseTo(0.07, 5)
    expect(computePeaks(new Float32Array(0), 10)).toEqual(new Float32Array(10))
  })
})

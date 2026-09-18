import { describe, expect, test } from 'bun:test'
import { findPeaks, formatHz, frequencyToPitch } from '../../../../src/app/domain'


const SAMPLE_RATE = 44100
const FFT_SIZE    = 2048

function spectrum (length: number, fill: number, bumps: ReadonlyMap<number, number>): Uint8Array {
  const bins = new Uint8Array(length).fill(fill)
  for (const [ index, level ] of bumps)
    bins[index] = level
  return bins
}

describe('frequencyToPitch', () => {
  test('440 Hz is exactly A4, no cents off', () => {
    const pitch = frequencyToPitch(440)
    expect(pitch).toEqual({ name: 'A', octave: 4, cents: 0, label: 'A4' })
  })

  test('returns null for non-finite or non-positive input', () => {
    expect(frequencyToPitch(0)).toBeNull()
    expect(frequencyToPitch(-10)).toBeNull()
    expect(frequencyToPitch(Number.NaN)).toBeNull()
  })
})

describe('findPeaks on a synthetic spectrum', () => {
  test('finds a single symmetric peak at its exact bin, below the noise floor elsewhere', () => {
    const bins  = spectrum(16, 10, new Map([[ 3, 150 ], [ 4, 200 ], [ 5, 150 ]]))
    const peaks = findPeaks(bins, SAMPLE_RATE, FFT_SIZE)

    expect(peaks).toHaveLength(1)
    expect(peaks[0]!.bin).toBeCloseTo(4, 5)
    expect(peaks[0]!.level).toBe(200)
    expect(peaks[0]!.hz).toBeCloseTo(4 * (SAMPLE_RATE / FFT_SIZE), 5)
  })

  test('parabolic interpolation shifts the estimate toward the stronger neighbour', () => {
    const bins     = spectrum(16, 10, new Map([[ 3, 150 ], [ 4, 200 ], [ 5, 180 ]]))
    const [ peak ] = findPeaks(bins, SAMPLE_RATE, FFT_SIZE)

    expect(peak!.bin).toBeGreaterThan(4)
    expect(peak!.bin).toBeLessThan(5)
  })

  test('ignores bumps that never clear the noise floor', () => {
    const bins = spectrum(16, 10, new Map([[ 4, 50 ]]))
    expect(findPeaks(bins, SAMPLE_RATE, FFT_SIZE)).toEqual([])
  })

  test('collapses two peaks closer than the minimum semitone separation to the stronger one', () => {
    const bins  = spectrum(16, 10, new Map([[ 4, 200 ], [ 5, 190 ]]))
    const peaks = findPeaks(bins, SAMPLE_RATE, FFT_SIZE)

    // Neighbouring bins at this sample rate/FFT size are well under a
    // semitone apart, so only the stronger of the two survives.
    expect(peaks).toHaveLength(1)
    expect(peaks[0]!.level).toBe(200)
  })

  test('keeps well-separated peaks, sorted strongest first and capped at `limit`', () => {
    const bins = spectrum(64, 10, new Map([
      [ 8, 220 ],
      [ 24, 180 ],
      [ 48, 255 ],
    ]))

    const peaks = findPeaks(bins, SAMPLE_RATE, FFT_SIZE, 2)
    expect(peaks).toHaveLength(2)
    expect(peaks.map(p =>
      p.level)).toEqual([ 255, 220 ])
  })
})

describe('formatHz', () => {
  test('formats sub-kHz as whole Hz', () => {
    expect(formatHz(440)).toBe('440 Hz')
  })

  test('formats kHz-and-above with two decimals', () => {
    expect(formatHz(1200)).toBe('1.20 kHz')
  })
})

import { describe, expect, test } from 'bun:test'
import { computeTempo } from '../../../../../src/app/services/analysis/tempo'


/** Deterministic PRNG (mulberry32) so the click track's noise bursts are reproducible. */
function mulberry32 (seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = state + 0x6D2B79F5 | 0

    let t = Math.imul(state ^ state >>> 15, 1 | state)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4_294_967_296
  }
}

/** A synthetic click track: short decaying noise bursts at an exact BPM. */
function clickTrack (bpm: number, sampleRate: number, seconds: number): Float32Array {
  const random          = mulberry32(120)
  const totalSamples    = Math.round(sampleRate * seconds)
  const mono            = new Float32Array(totalSamples)
  const intervalSamples = Math.round(sampleRate * 60 / bpm)
  const clickLength     = Math.round(sampleRate * 0.01) // 10 ms broadband transient

  for (let start = 0; start < totalSamples; start += intervalSamples)
    for (let i = 0; i < clickLength && start + i < totalSamples; i++) {
      const decay     = Math.exp(-i / (clickLength / 5))
      mono[start + i] = (random() * 2 - 1) * decay
    }

  return mono
}

describe('computeTempo', () => {
  test('a synthetic 120 BPM click track resolves within +-2 BPM', () => {
    const sampleRate = 44_100
    const mono       = clickTrack(120, sampleRate, 8)

    const { bpm, confidence } = computeTempo(mono, sampleRate)

    expect(bpm).toBeGreaterThanOrEqual(118)
    expect(bpm).toBeLessThanOrEqual(122)
    expect(confidence).toBeGreaterThan(0)
  })

  test('silence yields 0 confidence', () => {
    const result = computeTempo(new Float32Array(44_100 * 2), 44_100)
    expect(result.confidence).toBe(0)
  })

  test('empty input is zeroed, not NaN', () => {
    expect(computeTempo(new Float32Array(0), 44_100)).toEqual({ bpm: 0, confidence: 0 })
  })
})

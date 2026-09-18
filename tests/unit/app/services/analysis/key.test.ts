import { describe, expect, test } from 'bun:test'
import { estimateKey } from '../../../../../src/app/services/analysis/key'


function chromaFrame (activePitchClasses: readonly number[]): Float32Array {
  const frame = new Float32Array(12)
  for (const pc of activePitchClasses)
    frame[pc] = 1

  let norm = 0
  for (const v of frame)
    norm += v * v
  norm = Math.sqrt(norm)

  return frame.map(v =>
    v / norm)
}

describe('estimateKey', () => {
  test('an A major triad (A, C#, E) pattern reads as A major', () => {
    const A      = 9
    const CSharp = 1
    const E      = 4

    const frames = Array.from({ length: 20 }, () =>
      chromaFrame([ A, CSharp, E ]))

    const estimate = estimateKey(frames)

    expect(estimate.tonic).toBe('A')
    expect(estimate.scale).toBe('major')
    expect(estimate.label).toBe('A major')
    expect(estimate.confidence).toBeGreaterThan(0)
  })

  test('a C minor triad (C, D#, G) pattern reads as C minor', () => {
    const C      = 0
    const DSharp = 3
    const G      = 7

    const frames = Array.from({ length: 20 }, () =>
      chromaFrame([ C, DSharp, G ]))

    const estimate = estimateKey(frames)

    expect(estimate.tonic).toBe('C')
    expect(estimate.scale).toBe('minor')
    expect(estimate.label).toBe('C minor')
  })

  test('no frames is an unknown key with zero confidence', () => {
    expect(estimateKey([])).toEqual({ tonic: '', scale: 'unknown', label: '', confidence: 0 })
  })
})

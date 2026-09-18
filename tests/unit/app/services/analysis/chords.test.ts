import { describe, expect, test } from 'bun:test'
import { computeChords } from '../../../../../src/app/services/analysis/chords'


const C_MAJOR = [ 0, 4, 7 ] // C, E, G
const A_MINOR = [ 9, 0, 4 ] // A, C, E

function chromaFrame (activePitchClasses: readonly number[]): Float32Array {
  const frame = new Float32Array(12)
  for (const pc of activePitchClasses)
    frame[pc] = 1
  return frame
}

describe('computeChords', () => {
  test('a synthetic C-major then A-minor sequence produces a C run followed by an Am run', () => {
    const frameHopSeconds = 0.1
    const framesPerChord  = 30 // 3 s of each chord at 0.1 s/frame

    const frames = [
      ...Array.from({ length: framesPerChord }, () =>
        chromaFrame(C_MAJOR)),
      ...Array.from({ length: framesPerChord }, () =>
        chromaFrame(A_MINOR)),
    ]

    const segments = computeChords(frames, frameHopSeconds)

    expect(segments.length).toBeGreaterThan(0)
    expect(segments[0]!.label).toBe('C')
    expect(segments[0]!.start).toBe(0)
    expect(segments.at(-1)!.label).toBe('Am')

    // Runs are contiguous and cover the whole input.
    for (let i = 1; i < segments.length; i++)
      expect(segments[i]!.start).toBe(segments[i - 1]!.end)
    expect(segments.at(-1)!.end).toBeCloseTo(frames.length * frameHopSeconds, 5)

    for (const segment of segments)
      expect(segment.confidence).toBeGreaterThan(0)
  })

  test('empty input yields no segments', () => {
    expect(computeChords([], 0.1)).toEqual([])
    expect(computeChords([ chromaFrame(C_MAJOR) ], 0)).toEqual([])
  })
})

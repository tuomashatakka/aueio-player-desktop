/**
 * Krumhansl-Schmuckler key estimation over the mean of a track's chroma
 * frames — §9. Correlates the mean chroma against 24 rotated major/minor
 * tone profiles; `confidence` is the margin between the best and
 * second-best match, so an ambiguous or atonal passage reads as unsure
 * rather than confidently wrong.
 */
import type { AnalysisJSON } from '../../../shared/dto'


const NOTE_NAMES = [ 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B' ] as const

const PITCH_CLASSES = 12

/** Krumhansl & Kessler's 1982 major/minor key profiles, rooted at C. */
const MAJOR_PROFILE: readonly number[] = [ 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88 ]
const MINOR_PROFILE: readonly number[] = [ 6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17 ]

export type KeyScale = AnalysisJSON['key']['scale']

export interface KeyEstimate {
  readonly tonic:      string
  readonly scale:      KeyScale
  readonly label:      string
  readonly confidence: number
}

function rotate (profile: readonly number[], by: number): number[] {
  return profile.map((_, i) =>
    profile[(i - by + PITCH_CLASSES) % PITCH_CLASSES]!)
}

/** Pearson correlation between two equal-length vectors. */
function correlate (a: readonly number[], b: readonly number[]): number {
  const n     = a.length
  const meanA = a.reduce((sum, v) =>
    sum + v, 0) / n
  const meanB = b.reduce((sum, v) =>
    sum + v, 0) / n

  let numerator = 0
  let varA      = 0
  let varB      = 0

  for (let i = 0; i < n; i++) {
    const da = a[i]! - meanA
    const db = b[i]! - meanB
    numerator += da * db
    varA += da * da
    varB += db * db
  }

  const denominator = Math.sqrt(varA * varB)
  return denominator === 0 ? 0 : numerator / denominator
}

function meanChroma (frames: readonly Float32Array[]): number[] {
  const mean = Array.from({ length: PITCH_CLASSES }, () => 0)
  if (frames.length === 0)
    return mean

  for (const frame of frames)
    for (let i = 0; i < PITCH_CLASSES; i++)
      mean[i]! += frame[i] ?? 0

  return mean.map(sum =>
    sum / frames.length)
}

/** Estimates the overall key of a track from its {@link computeChroma} frames. */
export function estimateKey (chromaFrames: readonly Float32Array[]): KeyEstimate {
  if (chromaFrames.length === 0)
    return { tonic: '', scale: 'unknown', label: '', confidence: 0 }

  const mean = meanChroma(chromaFrames)

  const candidates: { readonly tonic: number, readonly scale: KeyScale, readonly score: number }[] = []

  for (let tonic = 0; tonic < PITCH_CLASSES; tonic++) {
    candidates.push({ tonic, scale: 'major', score: correlate(mean, rotate(MAJOR_PROFILE, tonic)) })
    candidates.push({ tonic, scale: 'minor', score: correlate(mean, rotate(MINOR_PROFILE, tonic)) })
  }

  candidates.sort((a, b) =>
    b.score - a.score)

  const best   = candidates[0]!
  const second = candidates[1]

  const tonic      = NOTE_NAMES[best.tonic]!
  const confidence = second ? Math.max(0, Math.min(1, best.score - second.score)) : 1

  return {
    tonic,
    scale: best.scale,
    label: `${tonic} ${best.scale}`,
    confidence,
  }
}

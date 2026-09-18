/**
 * Chord-segment detection — §9: 24 major/minor triad templates matched per
 * 0.5 s window, a 5-window median filter to smooth single-window flicker,
 * then merged into runs. Labels use sharps only (no enharmonic flats),
 * matching {@link estimateKey}'s note names.
 */
import type { ChordSegmentJSON } from '../../../shared/dto'


const NOTE_NAMES = [ 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B' ] as const

const PITCH_CLASSES = 12
const MAJOR_THIRD   = 4
const MINOR_THIRD   = 3
const FIFTH         = 7

const DEFAULT_OPTIONS: ChordDetectionOptions = { windowSeconds: 0.5, medianWindow: 5 }

export interface ChordDetectionOptions {
  readonly windowSeconds: number
  readonly medianWindow:  number
}

interface Template {
  readonly label: string
  readonly bins:  readonly number[]
}

type BestTemplateMatch = { readonly index: number, readonly score: number }

function triad (root: number, third: number): number[] {
  const bins                           = Array.from({ length: PITCH_CLASSES }, () => 0)
  bins[root]                           = 1
  bins[(root + third) % PITCH_CLASSES] = 1
  bins[(root + FIFTH) % PITCH_CLASSES] = 1
  return bins
}

/** 24 templates: root 0-11 major, then root 0-11 minor. */
function buildTemplates (): Template[] {
  const templates: Template[] = []

  for (let root = 0; root < PITCH_CLASSES; root++)
    templates.push({ label: NOTE_NAMES[root]!, bins: triad(root, MAJOR_THIRD) })

  for (let root = 0; root < PITCH_CLASSES; root++)
    templates.push({ label: `${NOTE_NAMES[root]!}m`, bins: triad(root, MINOR_THIRD) })

  return templates
}

const TEMPLATES = buildTemplates()

function cosineSimilarity (a: readonly number[], b: readonly number[]): number {
  let dot = 0
  let na  = 0
  let nb  = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    na  += a[i]! * a[i]!
    nb  += b[i]! * b[i]!
  }

  const denominator = Math.sqrt(na * nb)
  return denominator === 0 ? 0 : dot / denominator
}

function windowMean (frames: readonly Float32Array[], start: number, end: number): number[] {
  const mean  = Array.from({ length: PITCH_CLASSES }, () => 0)
  const count = Math.max(1, end - start)

  for (let f = start; f < end; f++) {
    const frame = frames[f]
    for (let i = 0; i < PITCH_CLASSES; i++)
      mean[i]! += frame?.[i] ?? 0
  }

  return mean.map(sum =>
    sum / count)
}

function bestTemplate (chroma: readonly number[]): BestTemplateMatch {
  let bestIndex = 0
  let bestScore = -Infinity

  for (let t = 0; t < TEMPLATES.length; t++) {
    const score = cosineSimilarity(chroma, TEMPLATES[t]!.bins)
    if (score > bestScore) {
      bestScore = score
      bestIndex = t
    }
  }

  return { index: bestIndex, score: bestScore }
}

function medianOf (values: readonly number[]): number {
  const sorted = [ ...values ].sort((a, b) =>
    a - b)
  return sorted[Math.floor(sorted.length / 2)]!
}

function medianFilter (indices: readonly number[], windowSize: number): number[] {
  const half = Math.floor(windowSize / 2)

  return indices.map((_, i) => {
    const lo = Math.max(0, i - half)
    const hi = Math.min(indices.length - 1, i + half)
    return medianOf(indices.slice(lo, hi + 1))
  })
}

function average (values: readonly number[]): number {
  if (values.length === 0)
    return 0
  return values.reduce((sum, v) =>
    sum + v, 0) / values.length
}

/**
 * Detects a chord timeline from {@link computeChroma}'s per-hop frames.
 *
 * @param chromaFrames    Consecutive chroma vectors, each `frameHopSeconds` apart.
 * @param frameHopSeconds Seconds per chroma frame (`hop / sampleRate`).
 */
export function computeChords (
  chromaFrames: readonly Float32Array[],
  frameHopSeconds: number,
  options: Partial<ChordDetectionOptions> = {}
): ChordSegmentJSON[] {
  if (chromaFrames.length === 0 || frameHopSeconds <= 0)
    return []

  const { windowSeconds, medianWindow } = { ...DEFAULT_OPTIONS, ...options }
  const framesPerWindow                 = Math.max(1, Math.round(windowSeconds / frameHopSeconds))
  const windowDuration                  = framesPerWindow * frameHopSeconds
  const windowCount                     = Math.ceil(chromaFrames.length / framesPerWindow)

  const rawIndex: number[] = []
  const rawScore: number[] = []

  for (let w = 0; w < windowCount; w++) {
    const start = w * framesPerWindow
    const end   = Math.min(start + framesPerWindow, chromaFrames.length)
    const mean  = windowMean(chromaFrames, start, end)
    const match = bestTemplate(mean)

    rawIndex.push(match.index)
    rawScore.push(Math.max(0, Math.min(1, match.score)))
  }

  const filtered                     = medianFilter(rawIndex, medianWindow)
  const segments: ChordSegmentJSON[] = []

  let runStart = 0
  for (let i = 1; i <= filtered.length; i++) {
    if (i < filtered.length && filtered[i] === filtered[runStart])
      continue

    segments.push({
      start:      runStart * windowDuration,
      end:        i * windowDuration,
      label:      TEMPLATES[filtered[runStart]!]!.label,
      confidence: average(rawScore.slice(runStart, i)),
    })
    runStart = i
  }

  return segments
}

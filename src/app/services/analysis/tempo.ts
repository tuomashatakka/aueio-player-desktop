/**
 * Tempo estimation — §9: a spectral-flux onset envelope (hop 512),
 * autocorrelated over the 60-200 BPM range, with the peak lag refined by
 * parabolic interpolation so the estimate is not quantised to whole envelope
 * frames.
 */
import { fft, hannWindow } from './fft'


const FFT_SIZE = 1024
const HOP      = 512
const MIN_BPM  = 60
const MAX_BPM  = 200

export interface TempoEstimate {
  readonly bpm:        number
  readonly confidence: number
}

/** Positive spectral difference between consecutive frames — one value per hop. */
function onsetEnvelope (mono: Float32Array, fftSize: number, hop: number): Float32Array {
  const window     = hannWindow(fftSize)
  const half       = fftSize / 2
  const frameCount = Math.max(1, Math.floor(Math.max(0, mono.length - fftSize) / hop) + 1)

  const re       = new Float64Array(fftSize)
  const im       = new Float64Array(fftSize)
  const envelope = new Float32Array(frameCount)

  let previous: Float64Array | null = null

  for (let f = 0; f < frameCount; f++) {
    const start = f * hop

    re.fill(0)
    im.fill(0)
    for (let i = 0; i < fftSize; i++)
      re[i] = (mono[start + i] ?? 0) * window[i]!

    fft(re, im)

    const magnitude = new Float64Array(half)
    for (let bin = 0; bin < half; bin++)
      magnitude[bin] = Math.hypot(re[bin]!, im[bin]!)

    let flux = 0
    if (previous)
      for (let bin = 0; bin < half; bin++) {
        const diff = magnitude[bin]! - previous[bin]!
        if (diff > 0)
          flux += diff
      }

    envelope[f] = flux
    previous = magnitude
  }

  return envelope
}

function autocorrelateAt (envelope: Float32Array, lag: number): number {
  let sum = 0
  for (let i = 0; i + lag < envelope.length; i++)
    sum += envelope[i]! * envelope[i + lag]!
  return sum
}

/** Estimates BPM from a downmixed mono signal at `sampleRate`. */
export function computeTempo (mono: Float32Array, sampleRate: number): TempoEstimate {
  if (mono.length === 0 || sampleRate <= 0)
    return { bpm: 0, confidence: 0 }

  const envelope     = onsetEnvelope(mono, FFT_SIZE, HOP)
  const envelopeRate = sampleRate / HOP

  const minLag = Math.max(1, Math.round(envelopeRate * 60 / MAX_BPM))
  const maxLag = Math.min(envelope.length - 2, Math.round(envelopeRate * 60 / MIN_BPM))
  if (maxLag <= minLag)
    return { bpm: 0, confidence: 0 }

  const correlations = new Float64Array(maxLag - minLag + 1)
  let bestOffset = 0
  let sum        = 0

  for (let lag = minLag; lag <= maxLag; lag++) {
    const value          = autocorrelateAt(envelope, lag)
    const offset         = lag - minLag
    correlations[offset] = value
    sum += value
    if (value > correlations[bestOffset]!)
      bestOffset = offset
  }

  const bestLag = minLag + bestOffset
  const peak    = correlations[bestOffset]!
  const mean    = sum / correlations.length

  // Parabolic interpolation around the peak, clamped to the searched range.
  const y0          = bestOffset > 0 ? correlations[bestOffset - 1]! : peak
  const y2          = bestOffset < correlations.length - 1 ? correlations[bestOffset + 1]! : peak
  const denominator = y0 - 2 * peak + y2
  const refinement  = denominator === 0 ? 0 : 0.5 * (y0 - y2) / denominator
  const refinedLag  = Math.min(maxLag, Math.max(minLag, bestLag + refinement))

  const bpm        = 60 * envelopeRate / refinedLag
  const confidence = peak > 0 ? Math.max(0, Math.min(1, (peak - mean) / (peak + mean))) : 0

  return { bpm, confidence }
}

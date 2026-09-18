/**
 * Runs the full §9 pipeline (chroma -> key + chords, plus tempo from the raw
 * signal) over one downmixed track and shapes the result as `AnalysisJSON`.
 * The one place {@link ANALYSIS_VERSION} is stamped onto a result — bumping
 * that constant is what invalidates every cached row in `track_analysis`.
 */
import { ANALYSIS_VERSION } from '../../../shared/constants'
import type { AnalysisJSON } from '../../../shared/dto'
import { computeChords } from './chords'
import { computeChroma } from './chroma'
import { estimateKey } from './key'
import { computeTempo } from './tempo'


const CHROMA_FFT_SIZE = 4096
const CHROMA_HOP      = 2048

export function analyzeAudio (mono: Float32Array, sampleRate: number, duration: number): AnalysisJSON {
  const chromaFrames    = computeChroma(mono, sampleRate, { fftSize: CHROMA_FFT_SIZE, hop: CHROMA_HOP })
  const frameHopSeconds = CHROMA_HOP / sampleRate

  const key    = estimateKey(chromaFrames)
  const chords = computeChords(chromaFrames, frameHopSeconds)
  const tempo  = computeTempo(mono, sampleRate)

  return {
    version: ANALYSIS_VERSION,
    duration,
    tempo,
    key:     {
      tonic:      key.tonic,
      scale:      key.scale,
      label:      key.label,
      confidence: key.confidence,
    },
    chords,
  }
}

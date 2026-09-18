/**
 * Chroma (pitch-class) frames — §9: STFT 4096/2048 with a Hann window, bins
 * folded into 12 pitch classes over 55-4200 Hz (roughly A1-C8, where most
 * musical harmony sits), each frame L2-normalised so loudness does not bias
 * {@link estimateKey}/chord matching toward whichever window happened to be
 * loud.
 */
import { fft, hannWindow } from './fft'


const DEFAULT_OPTIONS: ChromaOptions = { fftSize: 4096, hop: 2048 }

const MIN_HZ        = 55
const MAX_HZ        = 4200
const PITCH_CLASSES = 12

export interface ChromaOptions {
  readonly fftSize: number
  readonly hop:     number
}

/** A440 tuning: pitch class 9 is A, matching MIDI note-number mod 12 with C = 0. */
function pitchClassOf (hz: number): number {
  const midi = 69 + 12 * Math.log2(hz / 440)
  const pc   = Math.round(midi) % PITCH_CLASSES
  return (pc + PITCH_CLASSES) % PITCH_CLASSES
}

function l2Normalize (vector: Float32Array): Float32Array {
  let sumSquares = 0
  for (const value of vector)
    sumSquares += value * value

  const norm = Math.sqrt(sumSquares)
  if (norm === 0)
    return vector

  const out = new Float32Array(vector.length)
  for (let i = 0; i < vector.length; i++)
    out[i] = vector[i]! / norm

  return out
}

/** One 12-bin, L2-normalised chroma vector per hop across `mono`. */
export function computeChroma (
  mono: Float32Array,
  sampleRate: number,
  options: Partial<ChromaOptions> = {}
): Float32Array[] {
  const { fftSize, hop } = { ...DEFAULT_OPTIONS, ...options }
  if (mono.length === 0 || sampleRate <= 0)
    return []

  const window       = hannWindow(fftSize)
  const frameCount   = Math.max(1, Math.floor(Math.max(0, mono.length - fftSize) / hop) + 1)
  const halfSpectrum = fftSize / 2

  const re                     = new Float64Array(fftSize)
  const im                     = new Float64Array(fftSize)
  const frames: Float32Array[] = []

  for (let f = 0; f < frameCount; f++) {
    const start = f * hop

    re.fill(0)
    im.fill(0)
    for (let i = 0; i < fftSize; i++)
      re[i] = (mono[start + i] ?? 0) * window[i]!

    fft(re, im)

    const chroma = new Float32Array(PITCH_CLASSES)
    for (let bin = 1; bin < halfSpectrum; bin++) {
      const hz = bin * sampleRate / fftSize
      if (hz < MIN_HZ || hz > MAX_HZ)
        continue

      const magnitude = Math.hypot(re[bin]!, im[bin]!)
      const pc        = pitchClassOf(hz)
      chroma[pc]      = (chroma[pc] ?? 0) + magnitude
    }

    frames.push(l2Normalize(chroma))
  }

  return frames
}

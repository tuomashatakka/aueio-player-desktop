/**
 * The waveform's per-bar peaks — port of `decodeWaveformBars` from
 * `desktop-audio/src/app/contexts/AudioContext.tsx`, split out as a pure
 * function on an already-downmixed mono signal so it needs no `AudioContext`
 * and runs in the analysis worker (§9: "< 50 ms" budget, sent before the
 * slower `analysis` message).
 */

/** Floor of the normalised range — a silent bar still reads as a sliver, not nothing. */
const PEAK_FLOOR = 0.07

const DEFAULT_BARS = 400

/** Per-bar RMS of `mono`, normalised to `[0.07, 1]`. */
export function computePeaks (mono: Float32Array, bars = DEFAULT_BARS): Float32Array {
  const out = new Float32Array(bars)
  if (mono.length === 0 || bars <= 0)
    return out

  const samplesPerBar = Math.floor(mono.length / bars) || 1

  for (let i = 0; i < bars; i++) {
    const start = i * samplesPerBar
    const end   = Math.min(start + samplesPerBar, mono.length)

    let sum = 0
    for (let j = start; j < end; j++)
      sum += mono[j]! * mono[j]!

    out[i] = end > start ? Math.sqrt(sum / (end - start)) : 0
  }

  const max = out.reduce((a, b) =>
    Math.max(a, b), 0.001)

  for (let i = 0; i < bars; i++)
    out[i] = Math.max(PEAK_FLOOR, out[i]! / max)

  return out
}

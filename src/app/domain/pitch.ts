/**
 * Frequency → musical pitch, and finding the peaks worth naming.
 *
 * Pure functions with no Web Audio types in the signatures, so the maths is
 * testable against known tones (A4 is 440 Hz by definition) without an
 * `AudioContext`. Ported from desktop-audio/src/app/utils/pitch.ts.
 */

/** Sharps rather than flats — one spelling, chosen arbitrarily but stated. */
const NOTE_NAMES = [ 'C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B' ] as const

/** Concert pitch, and the MIDI number that names it. */
const A4_HZ   = 440
const A4_MIDI = 69

const SEMITONES          = 12
const CENTS_PER_SEMITONE = 100

/** Below this a "peak" is just noise floor wobble. */
const PEAK_FLOOR = 96

/** Two peaks closer than this are the same partial seen twice. */
const MIN_SEPARATION_SEMITONES = 1.5

export interface Pitch {

  /** e.g. `A♯`. */
  readonly name:   string
  readonly octave: number

  /** Signed distance from the tempered pitch, −50…+50. */
  readonly cents: number

  /** `A♯3`, ready to render. */
  readonly label: string
}

export interface Peak {

  /** Interpolated frequency in Hz — see {@link findPeaks}. */
  readonly hz: number

  /** Bin magnitude, 0–255, straight from `getByteFrequencyData`. */
  readonly level: number

  /** Fractional bin index, for placing a label along the spectrum. */
  readonly bin: number
}

/** The tempered pitch nearest `hz`, and how far off it is. */
export function frequencyToPitch (hz: number): Pitch | null {
  if (!Number.isFinite(hz) || hz <= 0)
    return null

  const exact   = A4_MIDI + SEMITONES * Math.log2(hz / A4_HZ)
  const nearest = Math.round(exact)
  const cents   = Math.round((exact - nearest) * CENTS_PER_SEMITONE)

  // MIDI 0 is C-1, so the octave is offset by one from the raw division.
  const octave = Math.floor(nearest / SEMITONES) - 1
  const name   = NOTE_NAMES[(nearest % SEMITONES + SEMITONES) % SEMITONES]!

  return { name, octave, cents, label: `${name}${octave}` }
}

/**
 * The strongest spectral peaks, with sub-bin frequency accuracy.
 *
 * A bin is 10–20 Hz wide, which at low pitches is worth more than a semitone —
 * reading the peak's bin index straight off would quantise A4 to whatever bin
 * happens to straddle 440. Fitting a parabola through the peak and its two
 * neighbours recovers the true maximum between them, which is what makes the
 * note readout trustworthy rather than decorative.
 *
 * Peaks within {@link MIN_SEPARATION_SEMITONES} of a stronger one are dropped:
 * a single tone smears across neighbouring bins, and three labels naming the
 * same note is noise.
 */
export function findPeaks (
  bins: Uint8Array,
  sampleRate: number,
  fftSize: number,
  limit = 3
): Peak[] {
  const binHz         = sampleRate / fftSize
  const found: Peak[] = []

  for (let i = 1; i < bins.length - 1; i++) {
    const level = bins[i]!
    if (level < PEAK_FLOOR)
      continue

    const left  = bins[i - 1]!
    const right = bins[i + 1]!
    if (level < left || level < right)
      continue

    // Parabolic interpolation. The denominator vanishes on a flat top, where
    // the bin centre is already the best estimate available.
    const denom  = left - 2 * level + right
    const offset = denom === 0 ? 0 : 0.5 * (left - right) / denom
    const bin    = i + offset

    found.push({ hz: bin * binHz, level, bin })
  }

  found.sort((a, b) =>
    b.level - a.level)

  const kept: Peak[] = []
  for (const peak of found) {
    if (kept.length >= limit)
      break

    const tooClose = kept.some(other =>
      Math.abs(SEMITONES * Math.log2(peak.hz / other.hz)) < MIN_SEPARATION_SEMITONES)

    if (!tooClose)
      kept.push(peak)
  }

  return kept
}

/** `440 Hz` / `1.2 kHz` — short enough to sit beside a peak. */
export function formatHz (hz: number): string {
  return hz >= 1000
    ? `${(hz / 1000).toFixed(2)} kHz`
    : `${Math.round(hz)} Hz`
}

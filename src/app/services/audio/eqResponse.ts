/**
 * The equaliser's magnitude response, in dB.
 *
 * Ported from `desktop-audio/src/app/services/eqResponse.ts` for the ten
 * bands in `dspChain.ts`. Evaluates the same biquad coefficients
 * `BiquadFilterNode` builds (RBJ's cookbook, shelf slope `S` welded to 1) so
 * the curve on screen is the curve the filters actually produce — sixteen
 * (here, ten) overlapping bands at `Q` 1.4 do not sum the way a spline
 * through the fader values would suggest.
 *
 * Pure, and deliberately free of an `AudioContext`: `getFrequencyResponse()`
 * gives the same answer but only once a graph exists.
 */
import { BAND_Q, EQ_BANDS } from './dspChain'


const FLAT: Coefficients = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 }

/** Biquad coefficients, already normalised by `a0`. */
interface Coefficients {
  readonly b0: number
  readonly b1: number
  readonly b2: number
  readonly a1: number
  readonly a2: number
}

function peaking (w0: number, gainDb: number, q: number): Coefficients {
  const a     = 10 ** (gainDb / 40)
  const alpha = Math.sin(w0) / (2 * q)
  const cos   = Math.cos(w0)
  const a0    = 1 + alpha / a

  return {
    b0: (1 + alpha * a) / a0,
    b1: -2 * cos / a0,
    b2: (1 - alpha * a) / a0,
    a1: -2 * cos / a0,
    a2: (1 - alpha / a) / a0,
  }
}

/**
 * `direction` is +1 for a low shelf and -1 for a high shelf: the two formulas
 * are the same expression with the sign of every `cos` term flipped.
 */
function shelf (w0: number, gainDb: number, direction: 1 | -1): Coefficients {
  const a            = 10 ** (gainDb / 40)
  const cos          = Math.cos(w0) * direction
  const alpha        = Math.sin(w0) / 2 * Math.SQRT2
  const twoSqrtAlpha = 2 * Math.sqrt(a) * alpha

  const a0 = a + 1 + (a - 1) * cos + twoSqrtAlpha

  return {
    b0: a * (a + 1 - (a - 1) * cos + twoSqrtAlpha) / a0,
    b1: 2 * a * (a - 1 - (a + 1) * cos) * direction / a0,
    b2: a * (a + 1 - (a - 1) * cos - twoSqrtAlpha) / a0,
    a1: -2 * (a - 1 + (a + 1) * cos) * direction / a0,
    a2: (a + 1 + (a - 1) * cos - twoSqrtAlpha) / a0,
  }
}

function coefficientsFor (index: number, gainDb: number, sampleRate: number): Coefficients {
  const band = EQ_BANDS[index]
  if (!band || gainDb === 0)
    return FLAT

  const w0 = 2 * Math.PI * band.hz / sampleRate

  if (band.type === 'lowshelf')
    return shelf(w0, gainDb, 1)

  if (band.type === 'highshelf')
    return shelf(w0, gainDb, -1)

  return peaking(w0, gainDb, BAND_Q)
}

/** |H(e^jw)| in dB for one normalised biquad. */
function magnitudeDb (c: Coefficients, w: number): number {
  const cos1 = Math.cos(w)
  const sin1 = Math.sin(w)
  const cos2 = Math.cos(2 * w)
  const sin2 = Math.sin(2 * w)

  const numRe = c.b0 + c.b1 * cos1 + c.b2 * cos2
  const numIm = -(c.b1 * sin1 + c.b2 * sin2)
  const denRe = 1 + c.a1 * cos1 + c.a2 * cos2
  const denIm = -(c.a1 * sin1 + c.a2 * sin2)

  const num = Math.hypot(numRe, numIm)
  const den = Math.hypot(denRe, denIm)

  return den === 0 ? 0 : 20 * Math.log10(num / den)
}

/**
 * Total response of the cascade at each frequency, in dB. Filters in series
 * multiply their magnitudes, so in dB they add — a sum, not a maximum.
 *
 * @param gains      One entry per {@link EQ_BANDS} band, in dB.
 * @param hz         The frequencies to evaluate, in Hz.
 * @param sampleRate Defaults to the rate Chromium/WebKit open an output at.
 */
export function eqResponseDb (
  gains: readonly number[],
  hz: readonly number[],
  sampleRate = 48000
): Float32Array {
  const out = new Float32Array(hz.length)

  for (let band = 0; band < EQ_BANDS.length; band++) {
    const gain = gains[band] ?? 0
    if (gain === 0)
      continue

    const coefficients = coefficientsFor(band, gain, sampleRate)

    for (let i = 0; i < hz.length; i++)
      out[i] = (out[i] ?? 0) + magnitudeDb(coefficients, 2 * Math.PI * (hz[i] ?? 0) / sampleRate)
  }

  return out
}

/**
 * Where a frequency sits on a logarithmic axis, 0-1. Shared by the curve, the
 * spectrum drawn under it and the pointer handler that edits a band, so a
 * drag lands on the band it appears to land on.
 */
export function axisPosition (value: number, min: number, max: number): number {
  return Math.log(value / min) / Math.log(max / min)
}

/** The inverse, for turning a pointer's x back into a frequency. */
export function axisFrequency (position: number, min: number, max: number): number {
  return min * (max / min) ** position
}

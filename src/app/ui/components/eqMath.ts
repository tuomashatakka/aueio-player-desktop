/**
 * Pure EQ-curve math for `EqCurve`'s SVG — a small, `ui/`-local duplicate of
 * `services/audio/eqResponse.ts` (`ui/` may not import `services/`, see
 * AGENTS.md L8). Same ten ISO 1/3-octave bands, same RBJ biquad formulas, so
 * the curve on screen matches what the (out-of-reach) real filter graph
 * would draw.
 */

export type BandType = 'lowshelf' | 'peaking' | 'highshelf'

export interface EqBand {
  readonly label: string
  readonly hz:    number
  readonly type:  BandType
}

/** The ten bands, low to high — 31.5 Hz…16 kHz, shelves at the edges. */
export const EQ_BANDS: readonly EqBand[] = [
  { label: '31', hz: 31.5, type: 'lowshelf' },
  { label: '63', hz: 63, type: 'peaking' },
  { label: '125', hz: 125, type: 'peaking' },
  { label: '250', hz: 250, type: 'peaking' },
  { label: '500', hz: 500, type: 'peaking' },
  { label: '1k', hz: 1000, type: 'peaking' },
  { label: '2k', hz: 2000, type: 'peaking' },
  { label: '4k', hz: 4000, type: 'peaking' },
  { label: '8k', hz: 8000, type: 'peaking' },
  { label: '16k', hz: 16000, type: 'highshelf' },
]

export const BAND_Q = 1.4

interface Coefficients {
  readonly b0: number
  readonly b1: number
  readonly b2: number
  readonly a1: number
  readonly a2: number
}

const FLAT: Coefficients = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 }

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

/** Total response of the cascade at each frequency, in dB — filters in series sum in dB. */
export function eqResponseDb (
  gains: readonly number[],
  hz: readonly number[],
  sampleRate = 48000
): readonly number[] {
  const out = new Array<number>(hz.length).fill(0)

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

/** Where a frequency sits on a logarithmic axis, 0-1. */
export function axisPosition (value: number, min: number, max: number): number {
  return Math.log(value / min) / Math.log(max / min)
}

/** The inverse, for turning a pointer's x back into a frequency. */
export function axisFrequency (position: number, min: number, max: number): number {
  return min * (max / min) ** position
}

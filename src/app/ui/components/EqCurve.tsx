/** The EQ response curve: a log-frequency SVG path over `EQ_GAIN_LIMIT` dB of headroom either side of 0. */
import type { ReactElement } from 'react'
import { axisPosition, eqResponseDb } from './eqMath'


const MIN_HZ        = 20
const MAX_HZ        = 20000
const SAMPLE_COUNT  = 96
const VIEW_WIDTH    = 100
const VIEW_HEIGHT   = 40
const GAIN_LIMIT_DB = 12

const MID_Y     = VIEW_HEIGHT / 2
const QUARTER_Y = VIEW_HEIGHT / 4
const GRID_PATH = `M0 ${MID_Y} L${VIEW_WIDTH} ${MID_Y} M0 ${QUARTER_Y} L${VIEW_WIDTH} ${QUARTER_Y} M0 ${VIEW_HEIGHT - QUARTER_Y} L${VIEW_WIDTH} ${VIEW_HEIGHT - QUARTER_Y}`

function sampleFrequencies (): readonly number[] {
  return Array.from({ length: SAMPLE_COUNT }, (_, i) =>
    MIN_HZ * (MAX_HZ / MIN_HZ) ** (i / (SAMPLE_COUNT - 1)))
}

function curvePath (gains: readonly number[]): string {
  const freqs    = sampleFrequencies()
  const response = eqResponseDb(gains, freqs)

  const points = freqs.map((hz, i) => {
    const x  = axisPosition(hz, MIN_HZ, MAX_HZ) * VIEW_WIDTH
    const db = Math.max(-GAIN_LIMIT_DB, Math.min(GAIN_LIMIT_DB, response[i] ?? 0))
    const y  = VIEW_HEIGHT / 2 - db / GAIN_LIMIT_DB * (VIEW_HEIGHT / 2)
    return `${x.toFixed(2)} ${y.toFixed(2)}`
  })

  return `M${points.join(' L')}`
}

interface EqCurveProps {
  readonly gains: readonly number[]
}

export function EqCurve ({ gains }: EqCurveProps): ReactElement {
  const d = curvePath(gains)

  return <svg className="eq-curve" viewBox={ `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}` } preserveAspectRatio="none">
    {/*
      The 0 dB line and the ±half-headroom rules, so a flat curve reads as
      "flat" rather than as a stray line across an empty box.
      `vector-effect` keeps both these and the curve an even weight despite
      `preserveAspectRatio="none"` stretching the viewBox anisotropically.
    */}
    <path className="eq-grid" d={ GRID_PATH } vectorEffect="non-scaling-stroke" />
    <path d={ d } fill="none" vectorEffect="non-scaling-stroke" />
  </svg>
}

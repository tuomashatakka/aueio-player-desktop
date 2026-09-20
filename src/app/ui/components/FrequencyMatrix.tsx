/**
 * The FFT waterfall wallpaper: a wireframe ridge mesh in false perspective,
 * with the loudest partials labelled by note and frequency.
 *
 * The live analyser is a `services/audio/engine.ts` concern — out of `ui/`'s
 * reach — so the surface drawn here is a fixed spectrum, the same one every
 * render, and `data-live` marks the expanded copy, which is where a future
 * effect would drive the rAF loop that redraws it. The *labels*, though, are
 * derived from the mesh actually on screen rather than written by hand: each
 * one reads its peak's x position back through the same log frequency scale
 * the mesh is drawn on, so a peak always says the note it is standing on and
 * keeps doing so once real FFT frames replace {@link BUMPS}.
 */
import type { ReactElement } from 'react'


const VIEW_W = 100
const VIEW_H = 60

/** Rows receding into the distance, and samples across each one. */
const ROW_COUNT = 22
const COL_COUNT = 56

/** How much narrower the furthest row is than the nearest, and how far it rises. */
const DEPTH_SCALE = 0.4
const DEPTH_RISE  = 26

const FRONT_Y   = 54
const CENTER_X  = VIEW_W / 2
const AMPLITUDE = 19

/** Every nth column gets a mesh line; all of them would read as a solid fill. */
const MESH_STRIDE = 2

/** The standing spectrum: one gaussian partial per entry, x in 0‥1 of the width. */
const BUMPS: ReadonlyArray<{ readonly mu: number, readonly sigma: number, readonly height: number }> = [
  { mu: 0.16, sigma: 0.06, height: 0.58 },
  { mu: 0.29, sigma: 0.05, height: 0.96 },
  { mu: 0.43, sigma: 0.08, height: 0.74 },
  { mu: 0.57, sigma: 0.05, height: 0.87 },
  { mu: 0.71, sigma: 0.09, height: 0.52 },
  { mu: 0.85, sigma: 0.06, height: 0.36 },
]

const PEAK_COUNT = 3

/** Clearance between a labelled peak's highest mesh point and its two label lines. */
const LABEL_CLEARANCE = 2.5

/** The audible decade the mesh's x axis spans, log-scaled like every spectrum display. */
const MIN_HZ = 20
const MAX_HZ = 20000

const NOTE_NAMES      = [ 'c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b' ]
const A4_HZ           = 440
const SEMITONES       = 12
const A4_OFFSET       = 9
const A4_OCTAVE       = 4
const NOTE_LABEL_DY   = -3.2
const VALUE_LABEL_DY  = -0.6
const NOTE_FONT_SIZE  = 2.4
const VALUE_FONT_SIZE = 2.1

interface Point {
  readonly x: number
  readonly y: number
}

interface Peak {
  readonly key:  string
  readonly note: string
  readonly hz:   number
  readonly at:   Point
}

interface FrequencyMatrixProps {
  readonly expanded: boolean
}

interface PeakLabelProps {
  readonly peak: Peak
}

/** Sums the standing partials at `t` (0‥1 across the width), rippled by row depth. */
function magnitude (t: number, depth: number): number {
  let sum = 0
  for (const bump of BUMPS) {
    const distance = (t - bump.mu) / bump.sigma
    sum += bump.height * Math.exp(-0.5 * distance * distance)
  }

  return sum * (0.72 + 0.28 * Math.cos(depth * Math.PI * 2 + t * 9))
}

/** Projects sample `col` of row `row` (0 = nearest) into the viewBox. */
function pointAt (row: number, col: number): Point {
  const t     = col / (COL_COUNT - 1)
  const depth = row / (ROW_COUNT - 1)
  const scale = 1 - DEPTH_SCALE * depth
  const rise  = depth * DEPTH_RISE
  const peak  = magnitude(t, depth) * AMPLITUDE * (1 - 0.35 * depth)

  return {
    x: CENTER_X + (t - 0.5) * VIEW_W * scale,
    y: FRONT_Y - rise - peak,
  }
}

function toPath (points: readonly Point[]): string {
  return points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')
}

function rowPath (row: number): string {
  return toPath(Array.from({ length: COL_COUNT }, (_, col) =>
    pointAt(row, col)))
}

function colPath (col: number): string {
  return toPath(Array.from({ length: ROW_COUNT }, (_, row) =>
    pointAt(row, col)))
}

/** The frequency the mesh's x axis stands for at `t`, on the usual log scale. */
function hzAt (t: number): number {
  return MIN_HZ * (MAX_HZ / MIN_HZ) ** t
}

/** The note `hz` is nearest to, in scientific pitch notation ('f#4'). */
function noteAt (hz: number): string {
  const steps  = Math.round(SEMITONES * Math.log2(hz / A4_HZ)) + A4_OFFSET
  const name   = NOTE_NAMES[(steps % SEMITONES + SEMITONES) % SEMITONES] ?? 'c'
  const octave = A4_OCTAVE + Math.floor(steps / SEMITONES)

  return `${name}${octave}`
}

/**
 * The highest point any row reaches at column `col`. Anchoring a label to
 * the nearest row instead would bury it in the mesh: the rows *behind* that
 * one are drawn further up the viewBox and would cross straight through it.
 */
function crestAt (col: number): Point {
  let crest = pointAt(0, col)

  for (let row = 1; row < ROW_COUNT; row++) {
    const candidate = pointAt(row, col)
    if (candidate.y < crest.y)
      crest = candidate
  }

  return crest
}

/** The loudest partials, labelled in the clear above their own crest. */
function peaks (): readonly Peak[] {
  return [ ...BUMPS ]
    .sort((a, b) =>
      b.height - a.height)
    .slice(0, PEAK_COUNT)
    .map(bump => {
      const hz    = hzAt(bump.mu)
      const crest = crestAt(Math.round(bump.mu * (COL_COUNT - 1)))

      return {
        key:  `${bump.mu}`,
        note: noteAt(hz),
        hz:   Math.round(hz),
        at:   { x: crest.x, y: crest.y - LABEL_CLEARANCE },
      }
    })
}

export function FrequencyMatrix ({ expanded }: FrequencyMatrixProps): ReactElement {
  // Back to front: the nearer rows have to paint over the further ones.
  const rows = Array.from({ length: ROW_COUNT }, (_, index) =>
    ROW_COUNT - 1 - index)

  const cols = Array.from({ length: Math.ceil(COL_COUNT / MESH_STRIDE) }, (_, index) =>
    index * MESH_STRIDE)

  return <div className="frequency-matrix" data-live={ expanded ? '' : undefined }>
    <svg viewBox={ `0 0 ${VIEW_W} ${VIEW_H}` } preserveAspectRatio="xMidYMid meet">
      {cols.map(col =>
        <path key={ `c${col}` } className="matrix-row" d={ colPath(col) } />)}

      {rows.map(row =>
        <path key={ `r${row}` } className={ row === 0 ? 'matrix-row matrix-current' : 'matrix-row' } d={ rowPath(row) } />)}

      {peaks().map(peak =>
        <PeakLabel key={ peak.key } peak={ peak } />)}
    </svg>
  </div>
}

function PeakLabel ({ peak }: PeakLabelProps): ReactElement {
  return <g className="matrix-peak">
    <text
      className="peak-note" x={ peak.at.x } y={ peak.at.y + NOTE_LABEL_DY }
      fontSize={ NOTE_FONT_SIZE } textAnchor="middle">
      {peak.note}
    </text>

    <text
      className="peak-value" x={ peak.at.x } y={ peak.at.y + VALUE_LABEL_DY }
      fontSize={ VALUE_FONT_SIZE } textAnchor="middle">
      {peak.hz}
      <tspan className="peak-unit"> hz</tspan>
    </text>
  </g>
}

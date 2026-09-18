/**
 * The FFT waterfall wallpaper (`--matrix-wallpaper` opacity). The live
 * analyser is a `services/audio/engine.ts` concern — out of `ui/`'s reach —
 * so this renders a static mesh; `data-live` marks the expanded copy, which
 * is where a future effect would drive the rAF loop that redraws it.
 */
import type { ReactElement } from 'react'


const ROW_COUNT = 8
const VIEW_SIZE = 100

function rowPath (row: number): string {
  const y = (row + 1) / (ROW_COUNT + 1) * VIEW_SIZE
  return `M0 ${y} L${VIEW_SIZE} ${y}`
}

interface FrequencyMatrixProps {
  readonly expanded: boolean
}

export function FrequencyMatrix ({ expanded }: FrequencyMatrixProps): ReactElement {
  const wallpaperRows = Array.from({ length: ROW_COUNT }, (_, row) =>
    row)

  return <div className="frequency-matrix" data-live={ expanded ? '' : undefined }>
    <svg viewBox={ `0 0 ${VIEW_SIZE} ${VIEW_SIZE}` } preserveAspectRatio="none">
      {wallpaperRows.map(row =>
        <path key={ row } d={ rowPath(row) } />)}

      <path className="matrix-current" d={ rowPath(ROW_COUNT - 1) } />
    </svg>
  </div>
}

/** The flat `<table>` view of a track list — used directly, or per group section. */
import type { ReactElement } from 'react'
import type { Track } from '../../domain'
import type { Density } from '../../state/ui'
import { useStore, useStores } from '../hooks/useStore'
import { ColumnHeader } from './ColumnHeader'
import type { TrackRowContext } from './TrackRow'
import { TrackRow } from './TrackRow'


interface TrackTableProps {
  readonly tracks:   readonly Track[]
  readonly density?: Density
}

export function TrackTable ({ tracks, density = 'normal' }: TrackTableProps): ReactElement {
  const stores = useStores()

  const columns   = useStore(stores.ui, state =>
    state.columns)
  const sort      = useStore(stores.ui, state =>
    state.sort)
  const selection = useStore(stores.ui, state =>
    state.selection)

  const visibleColumns = columns.filter(column =>
    column.visible)
  const orderedIds     = tracks.map(track =>
    track.id)

  const context: TrackRowContext = { columns: visibleColumns, orderedIds, selectedIds: selection.ids }

  return <table aria-rowcount={ tracks.length } data-density={ density }>
    <thead>
      <tr>
        {visibleColumns.map(column =>
          <ColumnHeader key={ column.key } column={ column } sort={ sort } />)}
      </tr>
    </thead>

    <tbody>
      {tracks.map((track, index) =>
        <TrackRow key={ track.id } track={ track } index={ index } selected={ selection.ids.has(track.id) } context={ context } />)}
    </tbody>
  </table>
}

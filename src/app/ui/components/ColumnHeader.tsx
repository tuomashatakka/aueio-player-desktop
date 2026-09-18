/** One `<th>` of the track table; sortable columns click to set `ui/sortSet`. */
import type { ReactElement } from 'react'
import type { SortDir, SortKey } from '../../state/library'
import type { ColumnConfig, ColumnKey, SortState } from '../../state/ui'
import { useStores } from '../hooks/useStore'


const COLUMN_LABELS: Record<ColumnKey, string> = {
  art:         '',
  index:       '#',
  title:       'Title',
  artist:      'Artist',
  album:       'Album',
  year:        'Year',
  genre:       'Genre',
  duration:    'Time',
  format:      'Format',
  size:        'Size',
  trackNumber: 'Track',
  rating:      'Rating',
  path:        'Path',
}

const SORTABLE_KEYS = new Set<ColumnKey>([
  'title', 'artist', 'album', 'year', 'genre', 'duration', 'format', 'size', 'trackNumber', 'rating', 'path',
])

function isSortKey (key: ColumnKey): key is ColumnKey & SortKey {
  return SORTABLE_KEYS.has(key)
}

function nextDir (active: boolean, current: SortDir): SortDir {
  if (!active)
    return 'asc'
  return current === 'asc' ? 'desc' : 'asc'
}

function ariaSortOf (active: boolean, sortable: boolean, dir: SortDir): 'ascending' | 'descending' | 'none' | undefined {
  if (active)
    return dir === 'asc' ? 'ascending' : 'descending'
  return sortable ? 'none' : undefined
}

interface ColumnHeaderProps {
  readonly column: ColumnConfig
  readonly sort:   SortState
}

export function ColumnHeader ({ column, sort }: ColumnHeaderProps): ReactElement {
  const stores   = useStores()
  const sortable = isSortKey(column.key)
  const active   = sortable && sort.key === column.key
  const ariaSort = ariaSortOf(active, sortable, sort.dir)

  function onClick (): void {
    if (!isSortKey(column.key))
      return

    stores.ui.dispatch({ type: 'ui/sortSet', key: column.key, dir: nextDir(active, sort.dir) })
  }

  if (!sortable)
    return <th scope="col">{COLUMN_LABELS[column.key]}</th>

  return <th scope="col" aria-sort={ ariaSort }>
    <button onClick={ onClick }>{COLUMN_LABELS[column.key]}</button>
  </th>
}

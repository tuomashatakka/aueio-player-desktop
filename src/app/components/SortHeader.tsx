import type { SortKey, SortDir } from '../state/types'


type ColDef = { key: SortKey | ''; label: string; cls: string }

const COLUMNS: ColDef[] = [
  { key: '',         label: '#',      cls: 'tr-num' },
  { key: '',         label: '',       cls: 'tr-indicator' },
  { key: '',         label: '',       cls: 'tr-cover' },
  { key: 'title',    label: 'Title',  cls: 'tr-title' },
  { key: 'artist',   label: 'Artist', cls: 'tr-artist' },
  { key: 'album',    label: 'Album',  cls: 'tr-album' },
  { key: 'genre',    label: 'Genre',  cls: 'tr-genre' },
  { key: 'year',     label: 'Year',   cls: 'tr-year' },
  { key: 'duration', label: 'Time',   cls: 'tr-duration' },
  { key: 'rating',   label: 'Rating', cls: 'tr-rating' },
  { key: '',         label: '',       cls: 'tr-edit-btn' },
]

type Props = {
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey, dir: SortDir) => void
}

export const SortHeader = ({ sortKey, sortDir, onSort }: Props) => {
  const handleClick = (key: SortKey) => {
    const dir: SortDir = key === sortKey && sortDir === 'asc' ? 'desc' : 'asc'
    onSort(key, dir)
  }

  return (
    <div id="library-header-row" role="row" aria-label="Sort columns">
      {COLUMNS.map((col, i) => {
        const isActive = col.key !== '' && col.key === sortKey
        const indicator = isActive ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''
        const sortable = col.key !== ''

        return (
          <span
            key={i}
            className={`sort-cell ${col.cls}${isActive ? ' sort-active' : ''}`}
            role="columnheader"
            data-sort-key={sortable ? col.key : undefined}
            tabIndex={sortable ? 0 : undefined}
            aria-sort={sortable ? (isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
            onClick={sortable ? () => handleClick(col.key as SortKey) : undefined}
            onKeyDown={sortable ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleClick(col.key as SortKey)
              }
            } : undefined}
          >
            {col.label}{indicator}
          </span>
        )
      })}
    </div>
  )
}

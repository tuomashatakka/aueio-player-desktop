/**
 * The track table's column configuration: order, width and visibility.
 * Ported from desktop-audio's `useColumnConfig` — see AGENTS.md L4.
 */

export const DEFAULT_COLUMNS: readonly ColumnConfig[] = [
  { key: 'art', width: '36px', resizable: false, visible: true },
  { key: 'index', width: '40px', resizable: false, visible: true },
  { key: 'title', width: '1fr', resizable: false, visible: true },
  { key: 'artist', width: '.55fr', resizable: true, visible: true },
  { key: 'album', width: '.55fr', resizable: true, visible: true },
  { key: 'year', width: '64px', resizable: true, visible: false },
  { key: 'genre', width: '120px', resizable: true, visible: false },
  { key: 'duration', width: '6ch', resizable: true, visible: true },
  { key: 'format', width: '6ch', resizable: true, visible: true },
  { key: 'size', width: '8ch', resizable: true, visible: false },
  { key: 'trackNumber', width: '5ch', resizable: true, visible: false },
  { key: 'rating', width: '6ch', resizable: true, visible: false },
  { key: 'path', width: '2fr', resizable: true, visible: false },
]

export type ColumnKey =
  | 'art' | 'index' | 'title' | 'artist' | 'album' | 'year' | 'genre' |
  'duration' | 'format' | 'size' | 'trackNumber' | 'rating' | 'path'

export interface ColumnConfig {
  readonly key:       ColumnKey
  readonly width:     string
  readonly resizable: boolean
  readonly visible:   boolean
}

/**
 * `saved` reconciled against `defaults`: known columns keep their saved
 * order, width and visibility; columns `defaults` has that `saved` does not
 * (a newly added column) are appended in default order; columns `saved` has
 * that `defaults` no longer knows about are dropped.
 */
export function reconcileColumns (
  saved: readonly ColumnConfig[],
  defaults: readonly ColumnConfig[] = DEFAULT_COLUMNS
): readonly ColumnConfig[] {
  const defaultKeys = new Set(defaults.map(column =>
    column.key))
  const known = saved.filter(column =>
    defaultKeys.has(column.key))

  const knownKeys = new Set(known.map(column =>
    column.key))
  const appended = defaults.filter(column =>
    !knownKeys.has(column.key))

  return [ ...known, ...appended ]
}

/** The `grid-template-columns` value for the currently visible columns, in order. */
export function gridTemplate (columns: readonly ColumnConfig[]): string {
  return columns
    .filter(column =>
      column.visible)
    .map(column =>
      column.width)
    .join(' ')
}

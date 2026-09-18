/**
 * Pure `(state) => value` readers over the library slice, memoised where the
 * work is non-trivial. See AGENTS.md L4.
 */
import type { FolderNode, FolderRow, GroupBlock, Grouping, Track } from '../../domain'
import { buildFolderTree, buildGroups, subfolderRows } from '../../domain'
import { memoBy } from '../memo'
import type { LibraryState } from './state'


export const NUMERIC_KEYS = [ 'duration', 'year', 'size', 'trackNumber', 'rating' ] as const

/** All tracks, in scan order. Memoised on `order` + `byId` identity. */
export const selectTracks = memoBy(
  (state: LibraryState): readonly Track[] =>
    state.order.flatMap(id => {
      const track = state.byId.get(id)
      return track ? [ track ] : []
    }),
  (state: LibraryState) =>
    [ state.order, state.byId ] as const,
)

const filterBySearch = memoBy(
  (tracks: readonly Track[], search: string): readonly Track[] => {
    const q = search.trim().toLowerCase()
    if (q.length === 0)
      return tracks

    return tracks.filter(track =>
      track.title.toLowerCase().includes(q) ||
      track.artist.toLowerCase().includes(q) ||
      track.album.toLowerCase().includes(q))
  },
  (tracks: readonly Track[], search: string) =>
    [ tracks, search ] as const,
)

/** `tracks` sorted by `key`; numeric keys compare as numbers, everything else by locale. */
export const selectSorted = memoBy(
  (tracks: readonly Track[], key: SortKey, dir: SortDir): readonly Track[] => {
    const sign = dir === 'desc' ? -1 : 1
    return tracks.slice().sort((a, b) =>
      sign * compareTracks(a, b, key))
  },
  (tracks: readonly Track[], key: SortKey, dir: SortDir) =>
    [ tracks, key, dir ] as const,
)

/** `tracks` bucketed by `grouping`; `'none'` yields no groups at all. */
export const selectGroups = memoBy(
  (tracks: readonly Track[], grouping: LibraryGrouping): readonly GroupBlock[] =>
    grouping === 'none' ? [] : buildGroups(tracks, grouping),
  (tracks: readonly Track[], grouping: LibraryGrouping) =>
    [ tracks, grouping ] as const,
)

const buildTree = memoBy(
  (roots: readonly string[], tracks: readonly Track[]): readonly FolderNode[] =>
    buildFolderTree(roots, tracks.map(track =>
      track.path)),
  (roots: readonly string[], tracks: readonly Track[]) =>
    [ roots, tracks ] as const,
)

export type SortKey = 'title' | 'artist' | 'album' | 'year' | 'genre' | 'duration' |
  'format' | 'size' | 'trackNumber' | 'rating' | 'path'
export type SortDir = 'asc' | 'desc'

/** `'none'` renders as a flat table — {@link selectGroups} answers `[]` for it. */
export type LibraryGrouping = Grouping | 'none'

/** {@link selectTracks}, narrowed to `state.search` — a lowercase substring over title/artist/album. */
export function selectFiltered (state: LibraryState): readonly Track[] {
  return filterBySearch(selectTracks(state), state.search)
}

/** The sidebar folder tree, one root per configured library root. */
export function selectFolderTree (state: LibraryState): readonly FolderNode[] {
  return buildTree(state.roots, selectTracks(state))
}

/** The rows to list for the folder at `selectedPath` (or the roots, when `null`). */
export function selectSubfolderRows (state: LibraryState, selectedPath: string | null): readonly FolderRow[] {
  return subfolderRows(selectFolderTree(state), selectedPath, selectTracks(state))
}

/** A playlist's tracks, resolved against the library currently in memory, in playlist order. */
export function selectByPlaylist (state: LibraryState, playlistId: string): readonly Track[] {
  return state.playlists.get(playlistId)?.resolve(state.byId) ?? []
}

/** `id`'s position in `tracks`, or `-1` when it is not among them. */
export function selectIndexOf (tracks: readonly Track[], id: string | null): number {
  return id === null
    ? -1
    : tracks.findIndex(track =>
      track.id === id)
}

function isNumericKey (key: SortKey): boolean {
  return (NUMERIC_KEYS as readonly string[]).includes(key)
}

function compareTracks (a: Track, b: Track, key: SortKey): number {
  if (isNumericKey(key)) {
    const av = Number(a[key] ?? 0)
    const bv = Number(b[key] ?? 0)
    return av - bv
  }

  const av = String(a[key] ?? '')
  const bv = String(b[key] ?? '')
  return av.localeCompare(bv)
}

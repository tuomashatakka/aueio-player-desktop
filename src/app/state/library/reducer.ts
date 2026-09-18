/**
 * The library slice's reducer. Pure — every branch copies the `ReadonlyMap`s
 * it touches exactly once and returns a fresh state object. See AGENTS.md L4.
 */
import { Playlist, Track } from '../../domain'
import type { LibraryAction } from './actions'
import type { LibraryState } from './state'

/** Upserts `tracks` into `byId`/`order`, preserving existing order for known ids. */
function upsertTracks (state: LibraryState, tracks: readonly Track[]): LibraryState {
  if (tracks.length === 0)
    return state

  const byId  = new Map(state.byId)
  const order = state.order.slice()

  for (const track of tracks) {
    if (!byId.has(track.id))
      order.push(track.id)
    byId.set(track.id, track)
  }

  return { ...state, byId, order }
}

export function libraryReducer (state: LibraryState, action: LibraryAction): LibraryState {
  switch (action.type) {
    case 'library/pageReceived':
      return upsertTracks(state, action.tracks.map(Track.fromJSON))
    case 'library/batchReceived':
      return upsertTracks(state, action.tracks.map(Track.fromJSON))
    case 'library/scanStarted':
      return { ...state, scan: { id: action.scanId, seen: 0, parsed: 0, status: 'scanning' }}
    case 'library/scanProgress':
      return action.scanId === state.scan.id
        ? { ...state, scan: { ...state.scan, seen: action.seen, parsed: action.parsed }}
        : state
    case 'library/scanDone': {
      if (action.scanId !== state.scan.id)
        return state

      const pruned = new Set(action.pruned)
      const byId   = new Map(state.byId)
      for (const id of pruned)
        byId.delete(id)

      return {
        ...state,
        byId,
        order: state.order.filter(id =>
          !pruned.has(id)),
        scan: { ...state.scan, status: 'done' },
      }
    }
    case 'library/scanFailed':
      return action.scanId === state.scan.id
        ? { ...state, scan: { ...state.scan, status: 'error' }}
        : state
    case 'library/tagsPatched':
      return upsertTracks(state, [ Track.fromJSON(action.track) ])
    case 'library/rootsChanged':
      return { ...state, roots: action.roots }
    case 'library/playlistSaved': {
      const playlists = new Map(state.playlists)
      const playlist  = Playlist.fromJSON(action.playlist)
      playlists.set(playlist.id, playlist)
      return { ...state, playlists }
    }

    case 'library/playlistDeleted': {
      if (!state.playlists.has(action.id))
        return state

      const playlists = new Map(state.playlists)
      playlists.delete(action.id)
      return { ...state, playlists }
    }
    case 'library/searchChanged':
      return { ...state, search: action.search }
    case 'library/selectionChanged':
      return { ...state, selection: { anchor: action.anchor, ids: new Set(action.ids) }}
    default:
      return state
  }
}

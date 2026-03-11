import type { Track } from './types'
import type { PlayerState, SortKey, SortDir, TreeGroupBy } from './types'
import type { Action } from './actions'
import { ActionType } from './actions'


// ─── Pure helpers ─────────────────────────────────────────────

const getFolderName = (path: string): string => {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 2] ?? 'Unknown'
}

const filterTracks = (
  tracks: readonly Track[],
  query: string,
  groupBy: TreeGroupBy,
  selectedNode: string | null,
): readonly Track[] => {
  let result = [ ...tracks ]

  if (selectedNode) {
    result = result.filter(t => {
      switch (groupBy) {
        case 'artist': return t.artist === selectedNode
        case 'album': return t.album === selectedNode
        case 'folder': return getFolderName(t.path) === selectedNode
        default: return true
      }
    })
  }

  const q = query.toLowerCase().trim()
  if (!q)
    return result

  return result.filter(
    t =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q) ||
      (t.genre?.toLowerCase().includes(q) ?? false)
  )
}

const sortTracks = (
  tracks: readonly Track[],
  key: SortKey,
  dir: SortDir,
): Track[] =>
  [ ...tracks ].sort((a, b) => {
    let av: string | number
    let bv: string | number

    switch (key) {
      case 'title': av = a.title.toLowerCase(); bv = b.title.toLowerCase(); break
      case 'artist': av = a.artist.toLowerCase(); bv = b.artist.toLowerCase(); break
      case 'album': av = a.album.toLowerCase(); bv = b.album.toLowerCase(); break
      case 'duration': av = a.duration; bv = b.duration; break
      case 'rating': av = a.rating ?? 0; bv = b.rating ?? 0; break
      case 'year': av = a.year ?? 0; bv = b.year ?? 0; break
      case 'genre': av = (a.genre ?? '').toLowerCase(); bv = (b.genre ?? '').toLowerCase(); break
      case 'trackNumber': av = a.trackNumber ?? 0; bv = b.trackNumber ?? 0; break
      default: av = a.title.toLowerCase(); bv = b.title.toLowerCase()
    }

    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return dir === 'asc' ? cmp : -cmp
  })

type DerivedSlice = Pick<PlayerState, 'filteredTracks' | 'currentTrackIndex'>

const applyFiltersAndSort = (state: PlayerState, tracks?: readonly Track[]): DerivedSlice => {
  const base = tracks ?? state.tracks
  const filtered = filterTracks(base, state.searchQuery, state.treeGroupBy, state.treeSelectedNode)
  const sorted = sortTracks(filtered, state.sortKey, state.sortDir)
  const currentTrack = state.filteredTracks[state.currentTrackIndex] ?? null
  const newIdx = currentTrack
    ? sorted.findIndex(t =>
      t.id === currentTrack.id)
    : -1
  return { filteredTracks: sorted, currentTrackIndex: newIdx }
}

// ─── Reducer ──────────────────────────────────────────────────

export const reducer = (state: PlayerState, action: Action): PlayerState => {
  switch (action.type) {
    case ActionType.TRACKS_LOADED: {
      const derived = applyFiltersAndSort({ ...state, tracks: action.payload }, action.payload)
      return { ...state, tracks: action.payload, ...derived, isLoading: false }
    }
    case ActionType.LIBRARY_LOADING:
      return { ...state, isLoading: true }
    case ActionType.TRACK_SELECTED:
      return { ...state, currentTrackIndex: action.payload, waveformData: null }
    case ActionType.PLAYBACK_STARTED:
      return { ...state, isPlaying: true }
    case ActionType.PLAYBACK_PAUSED:
      return { ...state, isPlaying: false }
    case ActionType.TIME_UPDATED:
      return { ...state, currentTime: action.payload.currentTime, duration: action.payload.duration }
    case ActionType.DURATION_SET:
      return { ...state, duration: action.payload }
    case ActionType.VOLUME_CHANGED:
      return { ...state, volume: action.payload }
    case ActionType.VIEW_CHANGED:
      return { ...state, activeView: action.payload }
    case ActionType.NOW_PLAYING_EXPANDED:
      return { ...state, isNowPlayingExpanded: true }
    case ActionType.NOW_PLAYING_COLLAPSED:
      return { ...state, isNowPlayingExpanded: false }
    case ActionType.SETTINGS_UPDATED:
      return { ...state, settings: action.payload }
    case ActionType.AUDIO_PORT_SET:
      return { ...state, audioPort: action.payload }
    case ActionType.WAVEFORM_LOADED:
      return { ...state, waveformData: action.payload }
    case ActionType.SEARCH_CHANGED: {
      const next = { ...state, searchQuery: action.payload }
      return { ...next, ...applyFiltersAndSort(next) }
    }

    case ActionType.TRACK_DURATION_LOADED: {
      const tracks = state.tracks.map((t, i) =>
        i === action.payload.index ? { ...t, duration: action.payload.duration } : t
      )
      return { ...state, tracks, ...applyFiltersAndSort({ ...state, tracks }, tracks) }
    }

    case ActionType.SORT_CHANGED: {
      const next = { ...state, sortKey: action.payload.key, sortDir: action.payload.dir }
      return { ...next, ...applyFiltersAndSort(next) }
    }
    case ActionType.THEME_CHANGED:
      return { ...state, theme: action.payload }
    case ActionType.TAG_EDIT_OPENED:
      return { ...state, tagEditingIndex: action.payload }
    case ActionType.TAG_EDIT_CLOSED:
      return { ...state, tagEditingIndex: null }
    case ActionType.TRACK_TAGS_UPDATED: {
      const tracks = state.tracks.map(t =>
        t.id === action.payload.id ? { ...t, ...action.payload.tags } : t
      )
      return { ...state, tracks, ...applyFiltersAndSort({ ...state, tracks }, tracks) }
    }
    case ActionType.TREE_TOGGLED:
      return { ...state, treeExpanded: !state.treeExpanded }
    case ActionType.TREE_GROUP_CHANGED: {
      const next = { ...state, treeGroupBy: action.payload, treeSelectedNode: null }
      return { ...next, ...applyFiltersAndSort(next) }
    }

    case ActionType.TREE_NODE_SELECTED: {
      const next = { ...state, treeSelectedNode: action.payload }
      return { ...next, ...applyFiltersAndSort(next) }
    }
    default:
      return state
  }
}

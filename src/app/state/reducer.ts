import type { Track } from './types'
import type { PlayerState } from './types'
import type { Action } from './actions'
import { ActionType } from './actions'


const filterTracks = (tracks: readonly Track[], query: string): readonly Track[] => {
  const q = query.toLowerCase().trim()

  if (!q)
    return [ ...tracks ]

  return tracks.filter(
    t =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q)
  )
}

export const reducer = (state: PlayerState, action: Action): PlayerState => {
  switch (action.type) {
  case ActionType.TRACKS_LOADED:
    return {
      ...state,
      tracks:         action.payload,
      filteredTracks: filterTracks(action.payload, state.searchQuery),
      isLoading:      false,
    }

  case ActionType.LIBRARY_LOADING:
    return { ...state, isLoading: true }

  case ActionType.TRACK_SELECTED:
    return {
      ...state,
      currentTrackIndex: action.payload,
      waveformData:      null,
    }

  case ActionType.PLAYBACK_STARTED:
    return { ...state, isPlaying: true }

  case ActionType.PLAYBACK_PAUSED:
    return { ...state, isPlaying: false }

  case ActionType.TIME_UPDATED:
    return {
      ...state,
      currentTime: action.payload.currentTime,
      duration:    action.payload.duration,
    }

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

  case ActionType.SEARCH_CHANGED:
    return {
      ...state,
      searchQuery:    action.payload,
      filteredTracks: filterTracks(state.tracks, action.payload),
    }

  case ActionType.TRACK_DURATION_LOADED: {
    const tracks = state.tracks.map((t, i) =>
      i === action.payload.index
        ? { ...t, duration: action.payload.duration }
        : t
    )

    return {
      ...state,
      tracks,
      filteredTracks: filterTracks(tracks, state.searchQuery),
    }
  }

  default:
    return state
  }
}

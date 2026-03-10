import type { Track, AppSettings, ViewName } from './types'


export const enum ActionType {
  TRACKS_LOADED         = 'TRACKS_LOADED',
  TRACK_SELECTED        = 'TRACK_SELECTED',
  PLAYBACK_STARTED      = 'PLAYBACK_STARTED',
  PLAYBACK_PAUSED       = 'PLAYBACK_PAUSED',
  TIME_UPDATED          = 'TIME_UPDATED',
  VOLUME_CHANGED        = 'VOLUME_CHANGED',
  VIEW_CHANGED          = 'VIEW_CHANGED',
  NOW_PLAYING_EXPANDED  = 'NOW_PLAYING_EXPANDED',
  NOW_PLAYING_COLLAPSED = 'NOW_PLAYING_COLLAPSED',
  SETTINGS_UPDATED      = 'SETTINGS_UPDATED',
  AUDIO_PORT_SET        = 'AUDIO_PORT_SET',
  WAVEFORM_LOADED       = 'WAVEFORM_LOADED',
  SEARCH_CHANGED        = 'SEARCH_CHANGED',
  LIBRARY_LOADING       = 'LIBRARY_LOADING',
  DURATION_SET          = 'DURATION_SET',
  TRACK_DURATION_LOADED = 'TRACK_DURATION_LOADED',
}

export type Action =
  | { type: ActionType.TRACKS_LOADED; payload: readonly Track[] }
  | { type: ActionType.TRACK_SELECTED; payload: number }
  | { type: ActionType.PLAYBACK_STARTED }
  | { type: ActionType.PLAYBACK_PAUSED }
  | { type: ActionType.TIME_UPDATED; payload: { currentTime: number; duration: number } }
  | { type: ActionType.VOLUME_CHANGED; payload: number }
  | { type: ActionType.VIEW_CHANGED; payload: ViewName }
  | { type: ActionType.NOW_PLAYING_EXPANDED }
  | { type: ActionType.NOW_PLAYING_COLLAPSED }
  | { type: ActionType.SETTINGS_UPDATED; payload: AppSettings }
  | { type: ActionType.AUDIO_PORT_SET; payload: number }
  | { type: ActionType.WAVEFORM_LOADED; payload: Float32Array | null }
  | { type: ActionType.SEARCH_CHANGED; payload: string }
  | { type: ActionType.LIBRARY_LOADING }
  | { type: ActionType.DURATION_SET; payload: number }
  | { type: ActionType.TRACK_DURATION_LOADED; payload: { index: number; duration: number } }

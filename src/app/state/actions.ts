import type { Track, AppSettings, ViewName, SortKey, SortDir, ThemeName, TreeGroupBy } from './types'
import type { TrackTagOverrides } from '../../bun/rpc'


export const enum ActionType {
  TRACKS_LOADED = 'TRACKS_LOADED',
  TRACK_SELECTED = 'TRACK_SELECTED',
  PLAYBACK_STARTED = 'PLAYBACK_STARTED',
  PLAYBACK_PAUSED = 'PLAYBACK_PAUSED',
  TIME_UPDATED = 'TIME_UPDATED',
  VOLUME_CHANGED = 'VOLUME_CHANGED',
  VIEW_CHANGED = 'VIEW_CHANGED',
  NOW_PLAYING_EXPANDED = 'NOW_PLAYING_EXPANDED',
  NOW_PLAYING_COLLAPSED = 'NOW_PLAYING_COLLAPSED',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  AUDIO_PORT_SET = 'AUDIO_PORT_SET',
  WAVEFORM_LOADED = 'WAVEFORM_LOADED',
  SEARCH_CHANGED = 'SEARCH_CHANGED',
  LIBRARY_LOADING = 'LIBRARY_LOADING',
  DURATION_SET = 'DURATION_SET',
  TRACK_DURATION_LOADED = 'TRACK_DURATION_LOADED',
  // New
  SORT_CHANGED = 'SORT_CHANGED',
  THEME_CHANGED = 'THEME_CHANGED',
  TAG_EDIT_OPENED = 'TAG_EDIT_OPENED',
  TAG_EDIT_CLOSED = 'TAG_EDIT_CLOSED',
  TRACK_TAGS_UPDATED = 'TRACK_TAGS_UPDATED',
  TREE_TOGGLED = 'TREE_TOGGLED',
  TREE_GROUP_CHANGED = 'TREE_GROUP_CHANGED',
  TREE_NODE_SELECTED = 'TREE_NODE_SELECTED',
}

export type Action =
  | { readonly type: ActionType.TRACKS_LOADED; readonly payload: readonly Track[] } |
  { readonly type: ActionType.TRACK_SELECTED; readonly payload: number } |
  { readonly type: ActionType.PLAYBACK_STARTED } |
  { readonly type: ActionType.PLAYBACK_PAUSED } |
  { readonly type: ActionType.TIME_UPDATED; readonly payload: { readonly currentTime: number; readonly duration: number }} |
  { readonly type: ActionType.VOLUME_CHANGED; readonly payload: number } |
  { readonly type: ActionType.VIEW_CHANGED; readonly payload: ViewName } |
  { readonly type: ActionType.NOW_PLAYING_EXPANDED } |
  { readonly type: ActionType.NOW_PLAYING_COLLAPSED } |
  { readonly type: ActionType.SETTINGS_UPDATED; readonly payload: AppSettings } |
  { readonly type: ActionType.AUDIO_PORT_SET; readonly payload: number } |
  { readonly type: ActionType.WAVEFORM_LOADED; readonly payload: Float32Array | null } |
  { readonly type: ActionType.SEARCH_CHANGED; readonly payload: string } |
  { readonly type: ActionType.LIBRARY_LOADING } |
  { readonly type: ActionType.DURATION_SET; readonly payload: number } |
  { readonly type: ActionType.TRACK_DURATION_LOADED; readonly payload: { readonly index: number; readonly duration: number }} |
  { readonly type: ActionType.SORT_CHANGED; readonly payload: { readonly key: SortKey; readonly dir: SortDir }} |
  { readonly type: ActionType.THEME_CHANGED; readonly payload: ThemeName } |
  { readonly type: ActionType.TAG_EDIT_OPENED; readonly payload: number } |
  { readonly type: ActionType.TAG_EDIT_CLOSED } |
  { readonly type: ActionType.TRACK_TAGS_UPDATED; readonly payload: { readonly id: string; readonly tags: TrackTagOverrides }} |
  { readonly type: ActionType.TREE_TOGGLED } |
  { readonly type: ActionType.TREE_GROUP_CHANGED; readonly payload: TreeGroupBy } |
  { readonly type: ActionType.TREE_NODE_SELECTED; readonly payload: string | null }

import type { PlayerState, Track } from '../state/types'


// ── Atomic selectors (return primitives) ──────────────────────────

export const selectActiveView           = (s: PlayerState) =>
  s.activeView

export const selectIsPlaying            = (s: PlayerState) =>
  s.isPlaying

export const selectCurrentTrackIndex    = (s: PlayerState) =>
  s.currentTrackIndex

export const selectCurrentTime          = (s: PlayerState) =>
  s.currentTime

export const selectDuration             = (s: PlayerState) =>
  s.duration

export const selectVolume               = (s: PlayerState) =>
  s.volume

export const selectIsNowPlayingExpanded = (s: PlayerState) =>
  s.isNowPlayingExpanded

export const selectAudioPort            = (s: PlayerState) =>
  s.audioPort

export const selectSearchQuery          = (s: PlayerState) =>
  s.searchQuery

export const selectIsLoading            = (s: PlayerState) =>
  s.isLoading

export const selectSortKey              = (s: PlayerState) =>
  s.sortKey

export const selectSortDir              = (s: PlayerState) =>
  s.sortDir

export const selectTheme                = (s: PlayerState) =>
  s.theme

export const selectTagEditingIndex      = (s: PlayerState) =>
  s.tagEditingIndex

export const selectTreeExpanded         = (s: PlayerState) =>
  s.treeExpanded

export const selectTreeGroupBy          = (s: PlayerState) =>
  s.treeGroupBy

export const selectTreeSelectedNode     = (s: PlayerState) =>
  s.treeSelectedNode

// ── Reference selectors (return objects — stable from reducer) ────

export const selectTracks               = (s: PlayerState) =>
  s.tracks

export const selectFilteredTracks       = (s: PlayerState) =>
  s.filteredTracks

export const selectWaveformData         = (s: PlayerState) =>
  s.waveformData

export const selectSettings             = (s: PlayerState) =>
  s.settings

// ── Derived selectors ─────────────────────────────────────────────

export const selectCurrentTrack = (s: PlayerState): Track | null =>
  s.currentTrackIndex >= 0
    ? s.filteredTracks[s.currentTrackIndex] ?? null
    : null

export const selectProgress = (s: PlayerState): number =>
  s.duration > 0 ? s.currentTime / s.duration : 0

export const selectTrackCount = (s: PlayerState): number =>
  s.filteredTracks.length

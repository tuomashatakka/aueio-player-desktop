/** The engine's read-only playback status, held in the player state slice. */

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

const DEFAULT_VOLUME = 0.8

export interface PlaybackState {
  readonly status:   PlaybackStatus
  readonly trackId:  string | null
  readonly position: number
  readonly duration: number
  readonly volume:   number
  readonly error?:   string
}

export function createPlaybackState (): PlaybackState {
  return {
    status:   'idle',
    trackId:  null,
    position: 0,
    duration: 0,
    volume:   DEFAULT_VOLUME,
  }
}

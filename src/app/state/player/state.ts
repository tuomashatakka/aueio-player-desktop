import type { DspJSON } from '../../../shared/dto'
import { DEFAULT_SETTINGS } from '../../../shared/settings'
import type { Analysis, PlaybackState, RepeatMode } from '../../domain'
import { createPlaybackState, Queue } from '../../domain'


export interface AnalysisFailure {
  readonly error: string
}

export type AnalysisEntry = Analysis | 'pending' | AnalysisFailure

export interface PlayerState {
  readonly playback:  PlaybackState
  readonly queue:     Queue
  readonly shuffle:   boolean
  readonly repeat:    RepeatMode
  readonly waveforms: ReadonlyMap<string, Float32Array>
  readonly analyses:  ReadonlyMap<string, AnalysisEntry>
  readonly dsp:       DspJSON
}

export function createPlayerState (): PlayerState {
  return {
    playback:  createPlaybackState(),
    queue:     Queue.empty(),
    shuffle:   false,
    repeat:    'none',
    waveforms: new Map(),
    analyses:  new Map(),
    dsp:       DEFAULT_SETTINGS.dsp,
  }
}

import type { AnalysisEntry, PlayerState } from './state'


export interface Progress {
  readonly position: number
  readonly duration: number
}

export function selectCurrentTrackId (state: PlayerState): string | null {
  return state.playback.trackId
}

export function selectProgress (state: PlayerState): Progress {
  return { position: state.playback.position, duration: state.playback.duration }
}

export function selectWaveform (id: string): (state: PlayerState) => Float32Array | undefined {
  return (state: PlayerState) =>
    state.waveforms.get(id)
}

export function selectAnalysis (id: string): (state: PlayerState) => AnalysisEntry | undefined {
  return (state: PlayerState) =>
    state.analyses.get(id)
}

import type { AnalysisJSON, DspJSON } from '../../../shared/dto'


export interface PlayerPlayRequested {
  readonly type:       'player/playRequested'
  readonly ids:        readonly string[]
  readonly startIndex: number
}

export interface PlayerEngineLoading {
  readonly type: 'player/engineLoading'
}

export interface PlayerEngineStarted {
  readonly type: 'player/engineStarted'
}

export interface PlayerEnginePaused {
  readonly type: 'player/enginePaused'
}

export interface PlayerEngineEnded {
  readonly type: 'player/engineEnded'
}

export interface PlayerEngineErrored {
  readonly type:    'player/engineErrored'
  readonly message: string
}

export interface PlayerEngineTime {
  readonly type:     'player/engineTime'
  readonly position: number
  readonly duration: number
}

export interface PlayerSeekRequested {
  readonly type:     'player/seekRequested'
  readonly position: number
}

export interface PlayerVolumeChanged {
  readonly type:   'player/volumeChanged'
  readonly volume: number
}

export interface PlayerShuffleToggled {
  readonly type: 'player/shuffleToggled'
}

export interface PlayerRepeatCycled {
  readonly type: 'player/repeatCycled'
}

export interface PlayerAdvance {
  readonly type:      'player/advance'
  readonly direction: 1 | -1
}

export interface PlayerWaveformReceived {
  readonly type: 'player/waveformReceived'
  readonly id:   string
  readonly bars: Float32Array
}

export interface PlayerAnalysisPending {
  readonly type: 'player/analysisPending'
  readonly id:   string
}

export interface PlayerAnalysisReceived {
  readonly type:     'player/analysisReceived'
  readonly id:       string
  readonly analysis: AnalysisJSON
}

export interface PlayerAnalysisFailed {
  readonly type:  'player/analysisFailed'
  readonly id:    string
  readonly error: string
}

export interface PlayerDspChanged {
  readonly type: 'player/dspChanged'
  readonly dsp:  DspJSON
}

export type PlayerAction =
  | PlayerPlayRequested |
  PlayerEngineLoading |
  PlayerEngineStarted |
  PlayerEnginePaused |
  PlayerEngineEnded |
  PlayerEngineErrored |
  PlayerEngineTime |
  PlayerSeekRequested |
  PlayerVolumeChanged |
  PlayerShuffleToggled |
  PlayerRepeatCycled |
  PlayerAdvance |
  PlayerWaveformReceived |
  PlayerAnalysisPending |
  PlayerAnalysisReceived |
  PlayerAnalysisFailed |
  PlayerDspChanged

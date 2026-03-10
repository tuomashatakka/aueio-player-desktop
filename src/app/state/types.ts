import type { Track, AppSettings } from '../../bun/rpc'


export type ViewName = 'library' | 'settings'

export type PlayerState = {
  readonly tracks: readonly Track[]
  readonly filteredTracks: readonly Track[]
  readonly currentTrackIndex: number
  readonly isPlaying: boolean
  readonly currentTime: number
  readonly duration: number
  readonly volume: number
  readonly activeView: ViewName
  readonly isNowPlayingExpanded: boolean
  readonly settings: AppSettings
  readonly audioPort: number
  readonly waveformData: Float32Array | null
  readonly searchQuery: string
  readonly isLoading: boolean
}

export const initialState: PlayerState = {
  tracks:               [],
  filteredTracks:       [],
  currentTrackIndex:    -1,
  isPlaying:            false,
  currentTime:          0,
  duration:             0,
  volume:               1,
  activeView:           'library',
  isNowPlayingExpanded: false,
  settings:             { folders: [], volume: 1 },
  audioPort:            0,
  waveformData:         null,
  searchQuery:          '',
  isLoading:            true,
}

export type { Track, AppSettings }

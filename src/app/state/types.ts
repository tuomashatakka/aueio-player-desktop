import type { Track, AppSettings } from '../../bun/rpc'


export type ViewName = 'library' | 'settings'

export type SortKey = 'title' | 'artist' | 'album' | 'duration' | 'rating' | 'year' | 'genre' | 'trackNumber'

export type SortDir = 'asc' | 'desc'

export type ThemeName = 'dark' | 'light' | 'solarized' | 'nord'

export type TreeGroupBy = 'folder' | 'artist' | 'album'

export type PlayerState = {
  readonly tracks:               readonly Track[]
  readonly filteredTracks:       readonly Track[]
  readonly currentTrackIndex:    number
  readonly isPlaying:            boolean
  readonly currentTime:          number
  readonly duration:             number
  readonly volume:               number
  readonly activeView:           ViewName
  readonly isNowPlayingExpanded: boolean
  readonly settings:             AppSettings
  readonly audioPort:            number
  readonly waveformData:         Float32Array | null
  readonly searchQuery:          string
  readonly isLoading:            boolean
  // Sort
  readonly sortKey:              SortKey
  readonly sortDir:              SortDir
  // Theme
  readonly theme:                ThemeName
  // Tag editor
  readonly tagEditingIndex:      number | null
  // Tree panel
  readonly treeExpanded:         boolean
  readonly treeGroupBy:          TreeGroupBy
  readonly treeSelectedNode:     string | null
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
  sortKey:              'title',
  sortDir:              'asc',
  theme:                'dark',
  tagEditingIndex:      null,
  treeExpanded:         true,
  treeGroupBy:          'artist',
  treeSelectedNode:     null,
}

export type { Track, AppSettings }

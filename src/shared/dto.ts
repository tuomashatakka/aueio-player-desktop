/**
 * The wire contract: JSON-shaped interfaces shared by main and the webview.
 * Nothing here imports React, the DOM, or Electrobun. See AGENTS.md and
 * docs/plans/desktop-audio-migration.md §4–§5.
 */

export interface TrackJSON {
  id:           string // = path
  path:         string
  title:        string
  artist:       string
  album:        string
  albumArtist?: string
  duration:     number
  format:       string
  size:         number
  year?:        number
  genre?:       string
  trackNumber?: number
  discNumber?:  number
  rating?:      number
  bpm?:         number
  comment?:     string
  lyrics?:      string
  bitrate?:     number
  sampleRate?:  number
  channels?:    number
  artId?:       string
  coverColor:   string
  mtimeMs:      number
}

export type TagPatchJSON = Partial<Pick<TrackJSON,
  | 'title' |
  'artist' |
  'album' |
  'albumArtist' |
  'year' |
  'genre' |
  'trackNumber' |
  'discNumber' |
  'rating' |
  'bpm' |
  'comment' |
  'lyrics'
>>

export interface DspJSON {
  eq: {
    on:    boolean
    gains: number[]
  }
  limiter: {
    on:        boolean
    threshold: number
    release:   number
  }
}

export interface SettingsJSON {
  roots:        string[]
  theme:        'dark' | 'light' | 'auto'
  accentSource: 'artwork' | 'custom'
  accentColor:  string
  fontScale:    number
  volume:       number
  shuffle:      boolean
  repeat:       'none' | 'one' | 'all'
  dsp:          DspJSON
  showChords:   boolean
  showKey:      boolean
  expandedSize: {
    width:  number
    height: number
  }
}

export interface PlaylistJSON {
  id:       string
  name:     string
  icon:     string
  trackIds: string[]
}

export interface ChordSegmentJSON {
  start:      number
  end:        number
  label:      string
  confidence: number
}

export interface AnalysisJSON {
  version:  number
  duration: number
  tempo: {
    bpm:        number
    confidence: number
  }
  key: {
    tonic:      string
    scale:      'major' | 'minor' | 'unknown'
    label:      string
    confidence: number
  }
  chords: ChordSegmentJSON[]
}

export type MenuItemJSON =
  | { id: string, label: string, enabled?: boolean, checked?: boolean, danger?: boolean } |
  { separator: true }

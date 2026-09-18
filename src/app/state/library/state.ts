import { Playlist, Track } from '../../domain'


export type ScanStatus = 'idle' | 'scanning' | 'done' | 'error'

export interface ScanState {
  readonly id:     string | null
  readonly seen:   number
  readonly parsed: number
  readonly status: ScanStatus
}

export interface SelectionState {
  readonly anchor: string | null
  readonly ids:    ReadonlySet<string>
}

export interface LibraryState {
  readonly byId:      ReadonlyMap<string, Track>
  readonly order:     readonly string[]
  readonly roots:     readonly string[]
  readonly scan:      ScanState
  readonly playlists: ReadonlyMap<string, Playlist>
  readonly search:    string
  readonly selection: SelectionState
}

export function createLibraryState (): LibraryState {
  return {
    byId:      new Map(),
    order:     [],
    roots:     [],
    scan:      { id: null, seen: 0, parsed: 0, status: 'idle' },
    playlists: new Map(),
    search:    '',
    selection: { anchor: null, ids: new Set() },
  }
}

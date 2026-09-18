import type { PlaylistJSON, TrackJSON } from '../../../shared/dto'


export interface LibraryPageReceived {
  readonly type:   'library/pageReceived'
  readonly tracks: readonly TrackJSON[]
  readonly total:  number
}

export interface LibraryBatchReceived {
  readonly type:   'library/batchReceived'
  readonly tracks: readonly TrackJSON[]
}

export interface LibraryScanStarted {
  readonly type:   'library/scanStarted'
  readonly scanId: string
}

export interface LibraryScanProgress {
  readonly type:   'library/scanProgress'
  readonly scanId: string
  readonly seen:   number
  readonly parsed: number
}

export interface LibraryScanDone {
  readonly type:   'library/scanDone'
  readonly scanId: string
  readonly total:  number
  readonly pruned: readonly string[]
}

export interface LibraryScanFailed {
  readonly type:    'library/scanFailed'
  readonly scanId:  string
  readonly message: string
}

export interface LibraryTagsPatched {
  readonly type:  'library/tagsPatched'
  readonly track: TrackJSON
}

export interface LibraryRootsChanged {
  readonly type:  'library/rootsChanged'
  readonly roots: readonly string[]
}

export interface LibraryPlaylistSaved {
  readonly type:     'library/playlistSaved'
  readonly playlist: PlaylistJSON
}

export interface LibraryPlaylistDeleted {
  readonly type: 'library/playlistDeleted'
  readonly id:   string
}

export interface LibrarySearchChanged {
  readonly type:   'library/searchChanged'
  readonly search: string
}

export interface LibrarySelectionChanged {
  readonly type:   'library/selectionChanged'
  readonly anchor: string | null
  readonly ids:    readonly string[]
}

export type LibraryAction =
  | LibraryPageReceived |
  LibraryBatchReceived |
  LibraryScanStarted |
  LibraryScanProgress |
  LibraryScanDone |
  LibraryScanFailed |
  LibraryTagsPatched |
  LibraryRootsChanged |
  LibraryPlaylistSaved |
  LibraryPlaylistDeleted |
  LibrarySearchChanged |
  LibrarySelectionChanged

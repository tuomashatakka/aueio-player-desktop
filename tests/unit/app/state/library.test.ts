import { describe, expect, test } from 'bun:test'
import { Playlist, Track } from '../../../../src/app/domain'
import type { LibraryAction } from '../../../../src/app/state/library/actions'
import { libraryReducer } from '../../../../src/app/state/library/reducer'
import {
  selectByPlaylist, selectFiltered, selectFolderTree, selectGroups, selectIndexOf,
  selectSorted, selectSubfolderRows, selectTracks,
} from '../../../../src/app/state/library/selectors'
import { createLibraryState } from '../../../../src/app/state/library/state'
import type { LibraryState } from '../../../../src/app/state/library/state'


function trackJson (id: string, patch: Record<string, unknown> = {}) {
  return {
    id, path: id, title: id, artist: 'Artist', album: 'Album', duration: 100, format: 'mp3', size: 1, coverColor: '#000', mtimeMs: 0, ...patch,
  }
}

describe('libraryReducer', () => {
  const initial = createLibraryState()

  const cases: ReadonlyArray<{ name: string, state: LibraryState, action: LibraryAction, expect: (state: LibraryState) => void }> = [
    {
      name:   'pageReceived upserts tracks into byId and order',
      state:  initial,
      action: { type: 'library/pageReceived', tracks: [ trackJson('/a.mp3'), trackJson('/b.mp3') ], total: 2 },
      expect: state => {
        expect(state.order).toEqual([ '/a.mp3', '/b.mp3' ])
        expect(state.byId.size).toBe(2)
      },
    },
    {
      name:   'batchReceived appends new ids but preserves order for known ones',
      state:  { ...initial, byId: new Map([[ '/a.mp3', Track.fromJSON(trackJson('/a.mp3')) ]]), order: [ '/a.mp3' ]},
      action: { type: 'library/batchReceived', tracks: [ trackJson('/a.mp3', { title: 'Updated' }), trackJson('/b.mp3') ]},
      expect: state => {
        expect(state.order).toEqual([ '/a.mp3', '/b.mp3' ])
        expect(state.byId.get('/a.mp3')?.title).toBe('Updated')
      },
    },
    {
      name:   'scanStarted resets scan progress under the new scanId',
      state:  initial,
      action: { type: 'library/scanStarted', scanId: 'scan-1' },
      expect: state => {
        expect(state.scan).toEqual({ id: 'scan-1', seen: 0, parsed: 0, status: 'scanning' })
      },
    },
    {
      name:   'scanProgress updates counters for the matching scanId',
      state:  { ...initial, scan: { id: 'scan-1', seen: 0, parsed: 0, status: 'scanning' }},
      action: { type: 'library/scanProgress', scanId: 'scan-1', seen: 10, parsed: 5 },
      expect: state => {
        expect(state.scan).toEqual({ id: 'scan-1', seen: 10, parsed: 5, status: 'scanning' })
      },
    },
    {
      name:   'scanProgress for a stale scanId is ignored',
      state:  { ...initial, scan: { id: 'scan-2', seen: 0, parsed: 0, status: 'scanning' }},
      action: { type: 'library/scanProgress', scanId: 'scan-1', seen: 10, parsed: 5 },
      expect: state => {
        expect(state.scan.seen).toBe(0)
      },
    },
    {
      name:  'scanDone prunes ids no longer under the scanned roots',
      state: {
        ...initial,
        byId:  new Map([[ '/a.mp3', Track.fromJSON(trackJson('/a.mp3')) ], [ '/b.mp3', Track.fromJSON(trackJson('/b.mp3')) ]]),
        order: [ '/a.mp3', '/b.mp3' ],
        scan:  { id: 'scan-1', seen: 2, parsed: 2, status: 'scanning' },
      },
      action: { type: 'library/scanDone', scanId: 'scan-1', total: 1, pruned: [ '/b.mp3' ]},
      expect: state => {
        expect(state.order).toEqual([ '/a.mp3' ])
        expect(state.byId.has('/b.mp3')).toBe(false)
        expect(state.scan.status).toBe('done')
      },
    },
    {
      name:   'scanFailed marks the matching scan as errored',
      state:  { ...initial, scan: { id: 'scan-1', seen: 0, parsed: 0, status: 'scanning' }},
      action: { type: 'library/scanFailed', scanId: 'scan-1', message: 'boom' },
      expect: state => {
        expect(state.scan.status).toBe('error')
      },
    },
    {
      name:   'tagsPatched upserts the patched track',
      state:  { ...initial, byId: new Map([[ '/a.mp3', Track.fromJSON(trackJson('/a.mp3')) ]]), order: [ '/a.mp3' ]},
      action: { type: 'library/tagsPatched', track: trackJson('/a.mp3', { title: 'Renamed' }) },
      expect: state => {
        expect(state.byId.get('/a.mp3')?.title).toBe('Renamed')
      },
    },
    {
      name:   'rootsChanged replaces the roots list',
      state:  initial,
      action: { type: 'library/rootsChanged', roots: [ '/music' ]},
      expect: state => {
        expect(state.roots).toEqual([ '/music' ])
      },
    },
    {
      name:   'playlistSaved adds/updates a playlist by id',
      state:  initial,
      action: { type: 'library/playlistSaved', playlist: { id: 'pl-1', name: 'Faves', icon: 'heart', trackIds: []}},
      expect: state => {
        expect(state.playlists.get('pl-1')?.name).toBe('Faves')
      },
    },
    {
      name:   'playlistDeleted removes a playlist by id',
      state:  { ...initial, playlists: new Map([[ 'pl-1', Playlist.fromJSON({ id: 'pl-1', name: 'Faves', icon: 'heart', trackIds: []}) ]]) },
      action: { type: 'library/playlistDeleted', id: 'pl-1' },
      expect: state => {
        expect(state.playlists.has('pl-1')).toBe(false)
      },
    },
    {
      name:   'searchChanged sets the search string',
      state:  initial,
      action: { type: 'library/searchChanged', search: 'chord' },
      expect: state => {
        expect(state.search).toBe('chord')
      },
    },
    {
      name:   'selectionChanged sets anchor and ids',
      state:  initial,
      action: { type: 'library/selectionChanged', anchor: '/a.mp3', ids: [ '/a.mp3', '/b.mp3' ]},
      expect: state => {
        expect(state.selection.anchor).toBe('/a.mp3')
        expect(state.selection.ids).toEqual(new Set([ '/a.mp3', '/b.mp3' ]))
      },
    },
    {
      name:   'an unknown action type is a no-op',
      state:  initial,
      action: { type: 'library/nonsense' } as unknown as LibraryAction,
      expect: state => {
        expect(state).toBe(initial)
      },
    },
  ]

  for (const { name, state, action, expect: assert } of cases)
    test(name, () => {
      assert(libraryReducer(state, action))
    })
})

describe('library selectors', () => {
  function stateWith (tracks: ReadonlyArray<ReturnType<typeof trackJson>>): LibraryState {
    const byId  = new Map(tracks.map(t =>
      [ t.id, Track.fromJSON(t) ]))
    const order = tracks.map(t =>
      t.id)
    return { ...createLibraryState(), byId, order, roots: [ '/music' ]}
  }

  test('selectTracks is memoised on order + byId identity', () => {
    const state  = stateWith([ trackJson('/a.mp3') ])
    const first  = selectTracks(state)
    const second = selectTracks(state)
    expect(second).toBe(first)

    const third = selectTracks({ ...state, order: [ ...state.order ]})
    expect(third).not.toBe(first)
    expect(third).toEqual(first)
  })

  test('selectFiltered matches a lowercase substring over title/artist/album', () => {
    const state = stateWith([
      trackJson('/a.mp3', { title: 'Blue Skies', artist: 'Miles', album: 'Kind of Blue' }),
      trackJson('/b.mp3', { title: 'Green Onions', artist: 'Booker T', album: 'Green Onions' }),
    ])

    expect(selectFiltered({ ...state, search: 'BLUE' }).map(t =>
      t.id)).toEqual([ '/a.mp3' ])
    expect(selectFiltered({ ...state, search: '' })).toHaveLength(2)
  })

  test('selectSorted: numeric keys compare numerically, others by locale', () => {
    const tracks = [
      Track.fromJSON(trackJson('/b.mp3', { title: 'b', duration: 200 })),
      Track.fromJSON(trackJson('/a.mp3', { title: 'a', duration: 50 })),
    ]

    expect(selectSorted(tracks, 'duration', 'asc').map(t =>
      t.id)).toEqual([ '/a.mp3', '/b.mp3' ])
    expect(selectSorted(tracks, 'title', 'desc').map(t =>
      t.id)).toEqual([ '/b.mp3', '/a.mp3' ])
  })

  test('selectGroups: "none" yields no groups; a real grouping buckets tracks', () => {
    const tracks = [
      Track.fromJSON(trackJson('/a.mp3', { album: 'X', artist: 'Same' })),
      Track.fromJSON(trackJson('/b.mp3', { album: 'X', artist: 'Same' })),
    ]

    expect(selectGroups(tracks, 'none')).toEqual([])
    expect(selectGroups(tracks, 'album')).toHaveLength(1)
  })

  test('selectFolderTree and selectSubfolderRows walk the scanned tracks', () => {
    const state = stateWith([ trackJson('/music/rock/a.mp3'), trackJson('/music/jazz/b.mp3') ])
    const tree  = selectFolderTree(state)

    expect(tree).toHaveLength(1)
    expect(selectSubfolderRows(state, null).map(r =>
      r.name)
      .sort()).toEqual([ 'music' ])
    expect(selectSubfolderRows(state, '/music').map(r =>
      r.name)
      .sort()).toEqual([ 'jazz', 'rock' ])
  })

  test('selectByPlaylist resolves against the library, dropping unknown playlists', () => {
    const state = stateWith([ trackJson('/a.mp3') ])
    expect(selectByPlaylist(state, 'nonexistent')).toEqual([])
  })

  test('selectIndexOf finds a track by id, or -1', () => {
    const tracks = [ Track.fromJSON(trackJson('/a.mp3')), Track.fromJSON(trackJson('/b.mp3')) ]
    expect(selectIndexOf(tracks, '/b.mp3')).toBe(1)
    expect(selectIndexOf(tracks, '/nope.mp3')).toBe(-1)
    expect(selectIndexOf(tracks, null)).toBe(-1)
  })
})

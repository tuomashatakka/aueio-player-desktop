import { Database } from 'bun:sqlite'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { migrate } from '../../../../src/main/db/schema'
import { openLibrary } from '../../../../src/main/db/repository'
import type { Library } from '../../../../src/main/db/repository'
import type { PlaylistJSON, TrackJSON } from '../../../../src/shared/dto'


function track (overrides: Partial<TrackJSON> = {}): TrackJSON {
  return {
    id:         overrides.path ?? '/music/a.mp3',
    path:       overrides.path ?? '/music/a.mp3',
    title:      'A Song',
    artist:     'An Artist',
    album:      'An Album',
    duration:   180,
    format:     'MP3',
    size:       1000,
    coverColor: 'hsl(0, 0%, 0%)',
    mtimeMs:    1000,
    ...overrides,
  }
}

let library: Library

beforeEach(() => {
  library = openLibrary(':memory:')
})

afterEach(() => {
  library.close()
})

describe('upsertTracks + pageTracks', () => {
  test('upserts and pages back a track', () => {
    library.upsertTracks([ track() ])

    const page = library.pageTracks({ limit: 10 })
    expect(page.total).toBe(1)
    expect(page.tracks).toHaveLength(1)
    expect(page.tracks[0]).toEqual(track())
    expect(page.next).toBeUndefined()
  })

  test('upserting the same id again updates rather than duplicates', () => {
    library.upsertTracks([ track() ])
    library.upsertTracks([ track({ title: 'Renamed' }) ])

    const page = library.pageTracks({ limit: 10 })
    expect(page.total).toBe(1)
    expect(page.tracks[0]?.title).toBe('Renamed')
  })

  test('keyset pagination walks every row exactly once, in title order', () => {
    const tracks = Array.from({ length: 25 }, (_, i) =>
      track({ path: `/music/${i}.mp3`, title: `Track ${String(i).padStart(2, '0')}` }))
    library.upsertTracks(tracks)

    const seen: string[] = []
    let after: string | undefined
    for (;;) {
      const page = library.pageTracks({ after, limit: 10 })
      seen.push(...page.tracks.map(t =>
        t.id))
      expect(page.total).toBe(25)
      if (!page.next)
        break
      after = page.next
    }

    expect(seen).toHaveLength(25)
    expect(new Set(seen).size).toBe(25)
    expect(seen).toEqual(tracks.map(t =>
      t.id))
  })
})

describe('patchTags', () => {
  test('updates only the patched fields and leaves mtime_ms untouched', () => {
    library.upsertTracks([ track({ mtimeMs: 12345 }) ])

    const patched = library.patchTags(track().id, { title: 'New Title', rating: 5 })

    expect(patched.title).toBe('New Title')
    expect(patched.rating).toBe(5)
    expect(patched.mtimeMs).toBe(12345)
    expect(library.mtimeOf(track().path)).toBe(12345)
  })

  test('an empty patch is a no-op that still returns the current row', () => {
    library.upsertTracks([ track() ])
    expect(library.patchTags(track().id, {})).toEqual(track())
  })
})

describe('forgetRoots / pruneNotIn', () => {
  test('forgetRoots removes everything under the given roots', () => {
    library.upsertTracks([
      track({ path: '/music/a/1.mp3' }),
      track({ path: '/music/a/2.mp3' }),
      track({ path: '/music/b/1.mp3' }),
    ])

    const result = library.forgetRoots([ '/music/a' ])

    expect(result.removed).toBe(2)
    expect(library.pageTracks({ limit: 10 }).total).toBe(1)
  })

  test('pruneNotIn removes rows under the roots that were not rediscovered', () => {
    library.upsertTracks([
      track({ path: '/music/a/1.mp3' }),
      track({ path: '/music/a/2.mp3' }),
      track({ path: '/music/b/1.mp3' }),
    ])

    const pruned = library.pruneNotIn([ '/music/a' ], [ '/music/a/1.mp3' ])

    expect(pruned).toEqual([ '/music/a/2.mp3' ])
    expect(library.pageTracks({ limit: 10 }).total).toBe(2)
    expect(library.getByPath('/music/b/1.mp3')).toBeDefined()
  })
})

describe('artwork', () => {
  test('round-trips mime + bytes and reports has()', () => {
    const bytes = new Uint8Array([ 1, 2, 3 ])
    expect(library.artwork.has('art1')).toBe(false)

    library.artwork.put('art1', 'image/png', bytes)

    expect(library.artwork.has('art1')).toBe(true)
    expect(library.artwork.get('art1')).toEqual({ mime: 'image/png', bytes })
  })
})

describe('analysis', () => {
  test('round-trips and only matches on mtime + version', () => {
    const analysis = {
      version:  1,
      duration: 180,
      tempo:    { bpm: 120, confidence: 0.9 },
      key:      { tonic: 'C', scale: 'major' as const, label: 'C major', confidence: 0.8 },
      chords:   [],
    }
    library.analysis.put('a1', 1000, 1, analysis)

    expect(library.analysis.get('a1', 1000, 1)).toEqual(analysis)
    expect(library.analysis.get('a1', 1000, 2)).toBeUndefined()
    expect(library.analysis.get('a1', 999, 1)).toBeUndefined()
  })
})

describe('playlists', () => {
  test('round-trips save/list/delete', () => {
    const playlist: PlaylistJSON = { id: 'p1', name: 'Favorites', icon: 'star', trackIds: [ 'a', 'b' ]}

    library.playlists.save(playlist)
    expect(library.playlists.list()).toEqual([ playlist ])

    library.playlists.delete('p1')
    expect(library.playlists.list()).toEqual([])
  })
})

describe('migrate', () => {
  test('running it twice on the same database is a no-op', () => {
    const db = new Database(':memory:', { strict: true })
    migrate(db)
    migrate(db)

    const tables = db.query<{ name: string }, []>(
      'SELECT name FROM sqlite_master WHERE type = \'table\' ORDER BY name'
    ).all()
      .map(row =>
        row.name)

    expect(tables).toEqual([ 'artwork', 'playlists', 'track_analysis', 'tracks' ])
    db.close()
  })
})

import { describe, expect, test } from 'bun:test'
import { Playlist, Track } from '../../../../src/app/domain'
import type { PlaylistJSON } from '../../../../src/shared/dto'


const FIXTURE: PlaylistJSON = {
  id:       'pl-1',
  name:     'Road Trip',
  icon:     'heart',
  trackIds: [ '/a.mp3', '/b.mp3' ],
}

describe('Playlist', () => {
  test('round-trips through fromJSON/toJSON', () => {
    expect(Playlist.fromJSON(FIXTURE).toJSON()).toEqual(FIXTURE)
  })

  test('falls back to the default icon for an unknown one', () => {
    expect(Playlist.fromJSON({ ...FIXTURE, icon: 'nonsense' }).icon).toBe('music')
  })

  test('is frozen', () => {
    expect(Object.isFrozen(Playlist.fromJSON(FIXTURE))).toBe(true)
  })

  test('`with` returns a distinct, still-frozen instance and never mutates the original', () => {
    const original = Playlist.fromJSON(FIXTURE)
    const patched  = original.with({ name: 'Renamed' })

    expect(patched).not.toBe(original)
    expect(patched.name).toBe('Renamed')
    expect(original.name).toBe('Road Trip')
    expect(Object.isFrozen(patched)).toBe(true)
  })

  test('withTracks replaces membership, deduplicated', () => {
    const playlist = Playlist.fromJSON(FIXTURE).withTracks([ '/c.mp3', '/c.mp3', '/d.mp3' ])
    expect(playlist.trackIds).toEqual([ '/c.mp3', '/d.mp3' ])
  })

  test('without removes one id, leaving the rest', () => {
    const playlist = Playlist.fromJSON(FIXTURE).without('/a.mp3')
    expect(playlist.trackIds).toEqual([ '/b.mp3' ])
  })

  test('resolve looks tracks up in library order, skipping ids no longer scanned', () => {
    const a    = Track.fromJSON({ id: '/a.mp3', path: '/a.mp3', title: 'A', artist: '', album: '', duration: 1, format: 'mp3', size: 1, coverColor: '#000', mtimeMs: 0 })
    const byId = new Map([[ a.id, a ]])

    expect(Playlist.fromJSON(FIXTURE).resolve(byId)).toEqual([ a ])
  })
})

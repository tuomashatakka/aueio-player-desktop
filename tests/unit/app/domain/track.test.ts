import { describe, expect, test } from 'bun:test'
import { Track } from '../../../../src/app/domain'
import type { TrackJSON } from '../../../../src/shared/dto'


const FIXTURE: TrackJSON = {
  id:          '/music/a.mp3',
  path:        '/music/a.mp3',
  title:       'A Song',
  artist:      'An Artist',
  album:       'An Album',
  albumArtist: 'An Artist',
  duration:    123.4,
  format:      'mp3',
  size:        4096,
  year:        1999,
  genre:       'Rock',
  trackNumber: 3,
  discNumber:  1,
  rating:      4,
  bpm:         120,
  comment:     'nice',
  lyrics:      'la la la',
  bitrate:     320000,
  sampleRate:  44100,
  channels:    2,
  artId:       'abc123',
  coverColor:  '#112233',
  mtimeMs:     1700000000000,
}

describe('Track', () => {
  test('round-trips through fromJSON/toJSON', () => {
    expect(Track.fromJSON(FIXTURE).toJSON()).toEqual(FIXTURE)
  })

  test('defaults missing fields on the way in', () => {
    const track = Track.fromJSON({ id: '/x.mp3', path: '/x.mp3', title: '', artist: '', album: '', duration: 0, format: '', size: 0, coverColor: '', mtimeMs: 0 })

    expect(track.title).toBe('')
    expect(track.year).toBeUndefined()
    expect(track.coverColor).toBe('#1a1a1a')
  })

  test('is frozen', () => {
    expect(Object.isFrozen(Track.fromJSON(FIXTURE))).toBe(true)
  })

  test('`with` returns a distinct, still-frozen instance and never mutates the original', () => {
    const original = Track.fromJSON(FIXTURE)
    const patched  = original.with({ title: 'New Title' })

    expect(patched).not.toBe(original)
    expect(patched.title).toBe('New Title')
    expect(original.title).toBe('A Song')
    expect(Object.isFrozen(patched)).toBe(true)
  })

  test('displayTitle falls back to the filename when there is no title', () => {
    const track = Track.fromJSON({ ...FIXTURE, title: '', path: '/music/nested/track-07.flac' })
    expect(track.displayTitle).toBe('track-07')
  })

  test('hasArt reflects a non-empty artId', () => {
    expect(Track.fromJSON(FIXTURE).hasArt).toBe(true)
    expect(Track.fromJSON({ ...FIXTURE, artId: undefined }).hasArt).toBe(false)
  })
})

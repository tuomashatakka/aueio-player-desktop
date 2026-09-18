import { describe, expect, test } from 'bun:test'
import { tracksForPayload, Track } from '../../../../src/app/domain'
import type { DragPayload } from '../../../../src/app/domain'


const tracks = [
  track('/music/rock/a.mp3', 'X', 'Rock Album'),
  track('/music/rock/b.mp3', 'X', 'Rock Album'),
  track('/music/rock/live/c.mp3', 'X', 'Rock Album'),
  track('/music/jazz/d.mp3', 'Y', 'Jazz Album'),
]

function track (path: string, artist = 'Artist', album = 'Album') {
  return Track.fromJSON({
    id: path, path, title: '', artist, album, duration: 1, format: 'mp3', size: 1, coverColor: '#000', mtimeMs: 0,
  })
}

const pick = (...indexes: number[]) =>
  indexes.map(index =>
    tracks[index]).filter(Boolean)

describe('tracksForPayload', () => {
  test('kind "tracks" resolves the listed ids, in `tracks` order', () => {
    const payload: DragPayload = { kind: 'tracks', trackIds: [ tracks[3]!.id, tracks[0]!.id ], label: '2 tracks' }
    expect(tracksForPayload(payload, tracks)).toEqual(pick(0, 3))
  })

  test('kind "folder" matches by path prefix, subfolders included', () => {
    const payload: DragPayload = { kind: 'folder', path: '/music/rock', label: 'rock' }
    expect(tracksForPayload(payload, tracks)).toEqual(pick(0, 1, 2))
  })

  test('kind "folder" does not match a sibling with an overlapping name prefix', () => {
    const decoy                = track('/music/rock-live/e.mp3')
    const payload: DragPayload = { kind: 'folder', path: '/music/rock', label: 'rock' }
    expect(tracksForPayload(payload, [ ...tracks, decoy ])).not.toContain(decoy)
  })

  test('kind "group" matches the album/artist bucket key', () => {
    const payload: DragPayload = { kind: 'group', grouping: 'artist', key: 'Y', label: 'Y' }
    expect(tracksForPayload(payload, tracks)).toEqual(pick(3))
  })

  test('kind "playlist" resolves to nothing — it carries no tracks of its own', () => {
    const payload: DragPayload = { kind: 'playlist', id: 'pl-1', label: 'My Playlist' }
    expect(tracksForPayload(payload, tracks)).toEqual([])
  })
})

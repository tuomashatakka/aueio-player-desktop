/** An album bucket, built by {@link buildAlbums} — never persisted directly. */
import { Track } from './Track'
import { buildGroups } from './grouping'


export class Album {
  private constructor (
    readonly key: string,
    readonly title: string,
    readonly tracks: readonly Track[],
    readonly duration: number,
    readonly trackCount: number,
    readonly artId: string | undefined,
  ) {
    Object.freeze(this)
  }

  static of (key: string, title: string, tracks: readonly Track[]): Album {
    const duration = tracks.reduce((sum, t) =>
      sum + t.duration, 0)
    const artId = tracks.find(t =>
      t.hasArt)?.artId

    return new Album(key, title, tracks, duration, tracks.length, artId)
  }
}

export function buildAlbums (tracks: readonly Track[]): readonly Album[] {
  return buildGroups(tracks, 'album').map(group =>
    Album.of(group.key, group.label, group.tracks))
}

/** An artist bucket, built by {@link buildArtists} — never persisted directly. */
import { Track } from './Track'
import { buildGroups } from './grouping'


export class Artist {
  private constructor (
    readonly key: string,
    readonly name: string,
    readonly tracks: readonly Track[],
    readonly duration: number,
    readonly trackCount: number,
    readonly artId: string | undefined,
  ) {
    Object.freeze(this)
  }

  static of (key: string, name: string, tracks: readonly Track[]): Artist {
    const duration = tracks.reduce((sum, t) =>
      sum + t.duration, 0)
    const artId = tracks.find(t =>
      t.hasArt)?.artId

    return new Artist(key, name, tracks, duration, tracks.length, artId)
  }
}

export function buildArtists (tracks: readonly Track[]): readonly Artist[] {
  return buildGroups(tracks, 'artist').map(group =>
    Artist.of(group.key, group.label, group.tracks))
}

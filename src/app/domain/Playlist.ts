/**
 * A user-curated ordered list of tracks.
 *
 * `trackIds` is the stored membership — a track's id is its path, so it
 * survives a rescan — and {@link Playlist.resolve} resolves it against the
 * library currently in memory. Ported from desktop-audio's
 * `src/app/services/types.ts` (`PLAYLIST_ICONS`) and `LibraryContext`'s
 * playlist resolution.
 */
import type { PlaylistJSON } from '../../shared/dto'
import { Track } from './Track'

/**
 * The icons a playlist may be given, in the order the picker offers them.
 * A closed set: most of the wider icon vocabulary names a control, and a
 * playlist wearing one of those reads as a button rather than as a list.
 */
export const PLAYLIST_ICONS = [
  'music', 'heart', 'star', 'disc', 'list', 'headphones', 'microphone',
  'bolt', 'clock', 'folder',
] as const

export type PlaylistIcon = typeof PLAYLIST_ICONS[number]

export const DEFAULT_PLAYLIST_ICON: PlaylistIcon = 'music'

function isPlaylistIcon (value: unknown): value is PlaylistIcon {
  return typeof value === 'string' && (PLAYLIST_ICONS as readonly string[]).includes(value)
}

export class Playlist {
  private constructor (
    readonly id: string,
    readonly name: string,
    readonly icon: PlaylistIcon,
    readonly trackIds: readonly string[],
  ) {
    Object.freeze(this)
  }

  static fromJSON (json: PlaylistJSON): Playlist {
    return new Playlist(
      json.id,
      typeof json.name === 'string' ? json.name : '',
      isPlaylistIcon(json.icon) ? json.icon : DEFAULT_PLAYLIST_ICON,
      Array.isArray(json.trackIds)
        ? json.trackIds.filter(id =>
          typeof id === 'string')
        : [],
    )
  }

  toJSON (): PlaylistJSON {
    return {
      id:       this.id,
      name:     this.name,
      icon:     this.icon,
      trackIds: this.trackIds as string[],
    }
  }

  with (patch: Partial<PlaylistJSON>): Playlist {
    return Playlist.fromJSON({ ...this.toJSON(), ...patch })
  }

  /** Replaces membership outright, deduplicated. */
  withTracks (trackIds: readonly string[]): Playlist {
    return this.with({ trackIds: [ ...new Set(trackIds) ]})
  }

  /** Removes one track id, if present. */
  without (trackId: string): Playlist {
    return this.trackIds.includes(trackId)
      ? this.with({ trackIds: this.trackIds.filter(id =>
        id !== trackId) })
      : this
  }

  /**
   * `trackIds` resolved against the library currently in memory, in playlist
   * order. An id whose file is no longer scanned simply does not resolve —
   * the id stays, so re-adding the folder brings it back.
   */
  resolve (byId: ReadonlyMap<string, Track>): readonly Track[] {
    const tracks: Track[] = []
    for (const id of this.trackIds) {
      const track = byId.get(id)
      if (track)
        tracks.push(track)
    }
    return tracks
  }
}

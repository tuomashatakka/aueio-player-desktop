/**
 * Bucketing tracks by the active grouping mode.
 *
 * Shared by {@link buildAlbums} and {@link buildArtists} and by selectors that
 * group the track table, so both agree on what an "album" is. Ported from
 * desktop-audio/src/app/utils/grouping.ts.
 */
import { Track } from './Track'

/** The groupings that produce buckets one can drill into. */
export type Grouping = 'album' | 'artist' | 'path'

/** One labelled bucket of tracks. */
export interface GroupBlock {
  readonly key:      string
  readonly label:    string
  readonly subtitle: string
  readonly tracks:   readonly Track[]
}

/** The directory holding `path`, handling both `/` and `\\` separators. */
export function parentDir (path: string): string {
  const idx = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return idx > 0 ? path.slice(0, idx) : '/'
}

/**
 * Group identity for a track under the active grouping mode.
 *
 * Album keys join artist and album with a zero-width space: two albums of the
 * same name by different artists are different buckets, and the separator can
 * never occur inside either field.
 */
export function bucketKey (track: Track, grouping: Grouping): string {
  switch (grouping) {
    case 'album':
      return `${track.artist}​${track.album}`
    case 'artist':
      return track.artist || 'Unknown Artist'
    case 'path':
      return parentDir(track.path)
    default:
      return ''
  }
}

/** Display name for the bucket `track` falls into; `key` is its bucket key. */
export function groupLabel (track: Track, grouping: Grouping, key: string): string {
  if (grouping === 'album')
    return track.album || 'Unknown Album'
  if (grouping === 'artist')
    return track.artist || 'Unknown Artist'
  return key
}

/** Buckets a list of tracks into labelled groups. */
export function buildGroups (tracks: readonly Track[], grouping: Grouping): readonly GroupBlock[] {
  const buckets = new Map<string, Track[]>()
  for (const t of tracks) {
    const k = bucketKey(t, grouping)
    if (!buckets.has(k))
      buckets.set(k, [])
    buckets.get(k)!.push(t)
  }

  const out: GroupBlock[] = []
  for (const [ key, bucketTracks ] of buckets) {
    const first = bucketTracks[0]!
    const label = groupLabel(first, grouping, key)

    const count    = `${bucketTracks.length} track${bucketTracks.length === 1 ? '' : 's'}`
    const subtitle = grouping === 'album'
      ? `${first.artist || 'Unknown Artist'} · ${count}`
      : count

    out.push({ key, label, subtitle, tracks: bucketTracks })
  }
  return out
}

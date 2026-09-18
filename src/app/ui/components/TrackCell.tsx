/** One `<td>`, its content chosen by `columnKey` — kept out of `TrackTable`'s `.map` per the lint's complex-callback rule. */
import type { ReactElement } from 'react'
import type { Track } from '../../domain'
import { formatTime } from '../../domain'
import type { ColumnKey } from '../../state/ui'
import { Rating } from './Rating'


const KILOBYTE = 1024

function formatSize (bytes: number): string {
  return bytes > 0 ? `${Math.round(bytes / KILOBYTE)} KB` : ''
}

function cellContent (track: Track, columnKey: ColumnKey): ReactElement | string | number {
  switch (columnKey) {
    case 'art':
      return <figure className="cover">
        <img src="" alt="" loading="lazy" decoding="async" />
      </figure>
    case 'index':
      return ''
    case 'title':
      return track.displayTitle
    case 'artist':
      return track.artist
    case 'album':
      return track.album
    case 'year':
      return track.year ?? ''
    case 'genre':
      return track.genre ?? ''
    case 'duration':
      return formatTime(track.duration)
    case 'format':
      return track.format
    case 'size':
      return formatSize(track.size)
    case 'trackNumber':
      return track.trackNumber ?? ''
    case 'rating':
      return <Rating trackId={ track.id } rating={ track.rating } />
    case 'path':
      return track.path
    default:
      return ''
  }
}

interface TrackCellProps {
  readonly track:     Track
  readonly columnKey: ColumnKey
}

export function TrackCell ({ track, columnKey }: TrackCellProps): ReactElement {
  return <td>{cellContent(track, columnKey)}</td>
}

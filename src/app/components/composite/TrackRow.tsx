import { memo } from 'react'
import type { Track } from '../../state/types'
import { formatTime } from '../../utils/dom'
import { getTrackEmoji } from '../../utils/audio'
import { PlayingBars } from '../atomic/PlayingBars'
import { StarRating } from '../atomic/StarRating'


type Props = {
  readonly track:     Track
  readonly index:     number
  readonly isCurrent: boolean
  readonly isPlaying: boolean
  readonly onPlay:    (idx: number) => void
  readonly onEdit:    (idx: number, track: Track, focusField?: string) => void
  readonly onRating:  (idx: number, rating: number) => void
}

export const TrackRow = memo(({ track, index, isCurrent, isPlaying, onPlay, onEdit, onRating }: Props) => {
  const color = track.coverColor ?? 'hsl(220,60%,40%)'
  const emoji = getTrackEmoji(track)

  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.tr-edit-btn'))
      return
    if ((e.target as HTMLElement).closest('[role="group"]'))
      return
    onPlay(index)
  }

  return (
    <div
      className={`track-row${isCurrent ? ' current' : ''}${isPlaying ? ' playing' : ''}`}
      role='row'
      tabIndex={0}
      data-track-id={track.id}
      onClick={handleRowClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onPlay(index)
        }
      }}
    >
      <span className='tr-num' role='gridcell'>{index + 1}</span>

      <span className='tr-indicator' role='gridcell' aria-hidden='true'>
        {isPlaying
          ? <PlayingBars />
          : isCurrent
            ? <span className='tr-current-dot' />
            : null
        }
      </span>

      <span className='tr-cover' role='gridcell'>
        <span className='track-cover-bg' style={{ background: color }} />
        <span className='track-cover-icon'>{emoji}</span>
      </span>

      <span className='tr-title' role='gridcell' title={track.title}>
        {track.title}
      </span>

      <span
        className='tr-artist'
        role='gridcell'
        data-editable='artist'
        title={track.artist}
        onClick={e => {
          e.stopPropagation(); onEdit(index, track, 'artist')
        }}
      >
        {track.artist}
      </span>

      <span
        className='tr-album'
        role='gridcell'
        data-editable='album'
        title={track.album}
        onClick={e => {
          e.stopPropagation(); onEdit(index, track, 'album')
        }}
      >
        {track.album}
      </span>

      <span
        className='tr-genre'
        role='gridcell'
        data-editable='genre'
        onClick={e => {
          e.stopPropagation(); onEdit(index, track, 'genre')
        }}
      >
        {track.genre ?? ''}
      </span>

      <span
        className='tr-year'
        role='gridcell'
        data-editable='year'
        onClick={e => {
          e.stopPropagation(); onEdit(index, track, 'year')
        }}
      >
        {track.year ? String(track.year) : ''}
      </span>

      <span className='tr-duration' role='gridcell'>
        {track.duration > 0 ? formatTime(track.duration) : '—'}
      </span>

      <span className='tr-rating' role='gridcell'>
        <StarRating
          value={track.rating ?? 0}
          onChange={rating =>
            onRating(index, rating)}
        />
      </span>

      <button
        className='tr-edit-btn'
        aria-label='Edit tags'
        title='Edit tags'
        data-idx={index}
        onClick={e => {
          e.stopPropagation(); onEdit(index, track)
        }}
      >
        ✎
      </button>
    </div>
  )
})

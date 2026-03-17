import { useRef, useEffect, memo, useCallback } from 'react'
import { ActionType } from '../../state/actions'
import { useSelector, useDispatch } from '../../hooks/useSelector'
import { usePlayback } from '../../hooks/usePlayback'
import { useEngine } from '../../context'
import {
  selectIsNowPlayingExpanded, selectCurrentTrack, selectIsPlaying,
  selectCurrentTime, selectDuration, selectVolume, selectWaveformData, selectProgress,
} from '../../selectors/index'
import { drawWaveformToCanvas } from '../../audio/waveform'
import { getTrackEmoji } from '../../utils/audio'
import { formatTime } from '../../utils/dom'


type Props = {
  readonly onPlayNext:        () => void
  readonly onPlayPrev:        () => void
  readonly onTogglePlayPause: () => void
}

export const NowPlayingView = memo(({ onPlayNext, onPlayPrev, onTogglePlayPause }: Props) => {
  const waveformRef = useRef<HTMLCanvasElement>(null)
  const dispatch    = useDispatch()
  const engine      = useEngine()

  const isExpanded  = useSelector(selectIsNowPlayingExpanded)
  const track       = useSelector(selectCurrentTrack)
  const isPlaying   = useSelector(selectIsPlaying)
  const currentTime = useSelector(selectCurrentTime)
  const duration    = useSelector(selectDuration)
  const volume      = useSelector(selectVolume)
  const waveformData = useSelector(selectWaveformData)
  const progress    = useSelector(selectProgress)

  const { seek } = usePlayback()

  const playIcon = isPlaying ? '⏸' : '▶'
  const color    = track?.coverColor ?? 'hsl(220,60%,40%)'

  // Redraw waveform when data or progress changes
  useEffect(() => {
    const canvas = waveformRef.current
    if (!canvas || !waveformData)
      return
    drawWaveformToCanvas(canvas, waveformData, progress, true)
  }, [ waveformData, progress ])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = waveformRef.current
    if (!canvas)
      return

    const rect  = canvas.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const newTime = ratio * duration
    engine.seek(newTime)
    dispatch({ type: ActionType.TIME_UPDATED, payload: { currentTime: newTime, duration: engine.duration }})
  }, [ engine, dispatch, duration ])

  // Tag display items
  const tagItems = track
    ? [
      { label: 'Album', value: track.album },
      { label: 'Artist', value: track.artist },
      { label: 'Genre', value: track.genre },
      { label: 'Year', value: track.year },
      { label: 'Track #', value: track.trackNumber },
      { label: 'Disk', value: track.diskNumber },
      { label: 'Comment', value: track.comment },
      { label: 'Duration', value: track.duration > 0 ? formatTime(track.duration) : undefined },
    ].filter(t =>
      t.value !== undefined && t.value !== '')
    : []

  return (
    <section
      id='now-playing-view'
      className={isExpanded ? 'active' : ''}
      role='region'
      aria-label='Now Playing'
    >
      <div id='np-bg' aria-hidden='true' style={{ background: color }} />
      <div id='np-bg-color' aria-hidden='true' style={{ background: color }} />

      <button
        id='np-back-btn'
        aria-label='Close Now Playing'
        onClick={() => {
          dispatch({ type: ActionType.NOW_PLAYING_COLLAPSED })
          history.back()
        }}
      >
        ←
      </button>

      <div id='np-content'>

        <div
          id='np-album-art'
          aria-hidden='true'
          className={isPlaying ? 'playing' : ''}
          style={{ background: color }}
        >
          <span id='np-album-art-title'>{track ? getTrackEmoji(track) : '🎵'}</span>
        </div>

        <div id='np-track-info'>
          <div id='np-track-info-bg' aria-hidden='true' />
          <div id='np-title' data-truncate>{track?.title ?? ''}</div>
          <div id='np-artist'>{track?.artist ?? ''}</div>
        </div>

        <div id='np-tags' aria-label='Track metadata' className='np-tags-row'>
          {tagItems.map(t =>

            <span key={t.label} className='np-tag'>
              <span className='np-tag-label'>{t.label}</span>
              <span className='np-tag-value'>{String(t.value)}</span>
            </span>
          )}
        </div>

        <div
          id='np-waveform-container'
          role='slider'
          aria-label='Playback position'
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <canvas
            ref={waveformRef}
            id='np-waveform-canvas'
            height={80}
            onClick={handleSeek}
          />

          <div id='np-time-row'>
            <span id='np-current-time'>{formatTime(currentTime)}</span>
            <span id='np-duration'>{formatTime(duration)}</span>
          </div>
        </div>

        <div id='np-controls'>
          <button id='np-prev-btn' data-icon aria-label='Previous track' onClick={onPlayPrev}>⏮</button>
          <button id='np-play-btn' data-icon aria-label='Play / Pause' onClick={onTogglePlayPause}>{playIcon}</button>
          <button id='np-next-btn' data-icon aria-label='Next track' onClick={onPlayNext}>⏭</button>
        </div>

        <div id='np-volume-row'>
          <span className='volume-icon' aria-hidden='true'>🔈</span>

          <input
            id='np-volume'
            type='range'
            min={0}
            max={1}
            step={0.01}
            value={volume}
            aria-label='Volume'
            onChange={e => {
              const vol = Number.parseFloat(e.target.value)
              engine.setVolume(vol)
              dispatch({ type: ActionType.VOLUME_CHANGED, payload: vol })
            }}
          />

          <span className='volume-icon' aria-hidden='true'>🔊</span>
        </div>

      </div>
    </section>
  )
})

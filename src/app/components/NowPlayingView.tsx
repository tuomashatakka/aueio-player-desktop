import { useRef, useEffect } from 'react'
import type { PlayerState } from '../state/types'
import type { Store } from '../state/index'
import type { AudioEngine } from '../audio/AudioEngine'
import { ActionType } from '../state/actions'
import { drawWaveformToCanvas } from '../audio/waveform'
import { getTrackEmoji } from '../utils/audio'
import { formatTime } from '../utils/dom'


type Props = {
  readonly state:             PlayerState
  readonly dispatch:          Store['dispatch']
  readonly engine:            AudioEngine
  readonly onPlayNext:        () => void
  readonly onPlayPrev:        () => void
  readonly onTogglePlayPause: () => void
}

export const NowPlayingView = ({ state, dispatch, engine, onPlayNext, onPlayPrev, onTogglePlayPause }: Props) => {
  const waveformRef = useRef<HTMLCanvasElement>(null)

  const track = state.currentTrackIndex >= 0
    ? state.filteredTracks[state.currentTrackIndex] ?? null
    : null

  const playIcon   = state.isPlaying ? '⏸' : '▶'
  const color      = track?.coverColor ?? 'hsl(220,60%,40%)'
  const progress   = state.duration > 0 ? state.currentTime / state.duration : 0

  // Redraw waveform when data or progress changes
  useEffect(() => {
    const canvas = waveformRef.current
    if (!canvas || !state.waveformData)
      return
    drawWaveformToCanvas(canvas, state.waveformData, progress, true)
  }, [ state.waveformData, state.currentTime, state.duration, progress ])

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = waveformRef.current
    if (!canvas)
      return

    const rect  = canvas.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const newTime = ratio * state.duration
    engine.seek(newTime)
    dispatch({ type: ActionType.TIME_UPDATED, payload: { currentTime: newTime, duration: engine.duration }})
  }

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
      className={state.isNowPlayingExpanded ? 'active' : ''}
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
          className={state.isPlaying ? 'playing' : ''}
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
            <span id='np-current-time'>{formatTime(state.currentTime)}</span>
            <span id='np-duration'>{formatTime(state.duration)}</span>
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
            value={state.volume}
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
}

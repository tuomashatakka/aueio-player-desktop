import { useRef, useEffect } from 'react'
import type { PlayerState, Track } from '../state/types'
import type { Store } from '../state/index'
import type { AudioEngine } from '../audio/AudioEngine'
import { ActionType } from '../state/actions'
import { drawWaveformToCanvas } from '../audio/waveform'
import { getTrackEmoji } from '../utils/audio'
import { navigateNowPlaying } from '../navigation/index'


type Props = {
  readonly state:             PlayerState
  readonly dispatch:          Store['dispatch']
  readonly engine:            AudioEngine
  readonly currentTrack:      Track | null
  readonly onPlayNext:        () => void
  readonly onPlayPrev:        () => void
  readonly onTogglePlayPause: () => void
}

export const NowPlayingBar = ({
  state, dispatch, engine, currentTrack,
  onPlayNext, onPlayPrev, onTogglePlayPause,
}: Props) => {
  const waveformRef = useRef<HTMLCanvasElement>(null)

  const playIcon = state.isPlaying ? '⏸' : '▶'
  const color    = currentTrack?.coverColor ?? 'hsl(220,60%,40%)'
  const progress = state.duration > 0 ? state.currentTime / state.duration : 0

  // Redraw mini waveform
  useEffect(() => {
    const canvas = waveformRef.current
    if (!canvas || !state.waveformData || !currentTrack)
      return
    drawWaveformToCanvas(canvas, state.waveformData, progress, false)
  }, [ state.waveformData, state.currentTime, state.duration, currentTrack, progress ])

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({ type: ActionType.NOW_PLAYING_EXPANDED })
    navigateNowPlaying(true)
  }

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation()

    const canvas = waveformRef.current
    if (!canvas)
      return

    const rect    = canvas.getBoundingClientRect()
    const ratio   = (e.clientX - rect.left) / rect.width
    const newTime = ratio * state.duration
    engine.seek(newTime)
    dispatch({ type: ActionType.TIME_UPDATED, payload: { currentTime: newTime, duration: engine.duration }})
  }

  return (
    <footer
      id='now-playing-bar'
      hidden={!currentTrack}
      aria-label='Now Playing mini player'
    >
      <div id='np-bar-album' aria-hidden='true'>
        <span
          id='np-bar-album-icon'
          style={{ background: color }}
          onClick={handleExpand}
        >
          {currentTrack ? getTrackEmoji(currentTrack) : '🎵'}
        </span>
      </div>

      <div id='np-bar-info' onClick={handleExpand}>
        <div id='np-bar-title' data-truncate>{currentTrack?.title ?? ''}</div>
        <div id='np-bar-artist' data-truncate>{currentTrack?.artist ?? ''}</div>
      </div>

      <canvas
        ref={waveformRef}
        id='np-bar-waveform'
        height={40}
        aria-hidden='true'
        onClick={handleSeek}
      />

      <div id='np-bar-controls'>
        <button
          id='np-bar-prev-btn'
          data-icon
          aria-label='Previous'
          onClick={e => {
            e.stopPropagation(); onPlayPrev()
          }}
        >
          ⏮
        </button>

        <button
          id='np-bar-play-btn'
          data-icon
          aria-label='Play / Pause'
          onClick={e => {
            e.stopPropagation(); onTogglePlayPause()
          }}
        >
          {playIcon}
        </button>

        <button
          id='np-bar-next-btn'
          data-icon
          aria-label='Next'
          onClick={e => {
            e.stopPropagation(); onPlayNext()
          }}
        >
          ⏭
        </button>
      </div>

      <button
        id='np-bar-expand'
        aria-label='Expand now playing'
        title='Expand'
        onClick={handleExpand}
      >
        ⌃
      </button>
    </footer>
  )
}

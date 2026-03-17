import { useRef, useEffect, memo, useCallback } from 'react'
import { ActionType } from '../../state/actions'
import { useSelector, useDispatch } from '../../hooks/useSelector'
import { useEngine } from '../../context'
import {
  selectIsPlaying, selectCurrentTime, selectDuration,
  selectWaveformData, selectCurrentTrack, selectProgress,
} from '../../selectors/index'
import { drawWaveformToCanvas } from '../../audio/waveform'
import { getTrackEmoji } from '../../utils/audio'
import { navigateNowPlaying } from '../../navigation/index'


type Props = {
  readonly onPlayNext:        () => void
  readonly onPlayPrev:        () => void
  readonly onTogglePlayPause: () => void
}

export const NowPlayingBar = memo(({ onPlayNext, onPlayPrev, onTogglePlayPause }: Props) => {
  const waveformRef = useRef<HTMLCanvasElement>(null)
  const dispatch    = useDispatch()
  const engine      = useEngine()

  const isPlaying    = useSelector(selectIsPlaying)
  const duration     = useSelector(selectDuration)
  const waveformData = useSelector(selectWaveformData)
  const currentTrack = useSelector(selectCurrentTrack)
  const progress     = useSelector(selectProgress)

  const playIcon = isPlaying ? '⏸' : '▶'
  const color    = currentTrack?.coverColor ?? 'hsl(220,60%,40%)'

  // Redraw mini waveform
  useEffect(() => {
    const canvas = waveformRef.current
    if (!canvas || !waveformData || !currentTrack)
      return
    drawWaveformToCanvas(canvas, waveformData, progress, false)
  }, [ waveformData, progress, currentTrack ])

  const handleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({ type: ActionType.NOW_PLAYING_EXPANDED })
    navigateNowPlaying(true)
  }, [ dispatch ])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation()

    const canvas = waveformRef.current
    if (!canvas)
      return

    const rect    = canvas.getBoundingClientRect()
    const ratio   = (e.clientX - rect.left) / rect.width
    const newTime = ratio * duration
    engine.seek(newTime)
    dispatch({ type: ActionType.TIME_UPDATED, payload: { currentTime: newTime, duration: engine.duration }})
  }, [ engine, dispatch, duration ])

  const handlePrevClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); onPlayPrev()
  }, [ onPlayPrev ])

  const handlePlayClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); onTogglePlayPause()
  }, [ onTogglePlayPause ])

  const handleNextClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); onPlayNext()
  }, [ onPlayNext ])

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
          onClick={handlePrevClick}
        >
          ⏮
        </button>

        <button
          id='np-bar-play-btn'
          data-icon
          aria-label='Play / Pause'
          onClick={handlePlayClick}
        >
          {playIcon}
        </button>

        <button
          id='np-bar-next-btn'
          data-icon
          aria-label='Next'
          onClick={handleNextClick}
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
})

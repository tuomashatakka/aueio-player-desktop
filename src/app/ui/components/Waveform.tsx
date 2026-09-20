/**
 * The seek bar: an SVG waveform (played/unplayed halves split by `--progress`)
 * with a transparent `input[type=range]` on top, and the elapsed/total clock
 * underneath — hidden per-tier in the footer bar, shown in the expanded
 * player (views.css).
 *
 * The envelope is drawn symmetrically about the vertical centre rather than
 * anchored to the floor, so the unplayed remainder reads as a waveform
 * rather than as a progress fill.
 *
 * `--progress` is a custom property the CSS clip-path reads — set
 * imperatively via `ref.style.setProperty` (the sanctioned way to write a
 * custom property without the banned `style` prop, see AGENTS.md L8's
 * ContextMenu note) in one justified effect, since React has no declarative
 * API for custom properties.
 */
import type { ChangeEvent, ReactElement } from 'react'
import { useEffect, useRef } from 'react'
import { useCurrentTrack } from '../hooks/useCurrentTrack'
import { useStore, useStores } from '../hooks/useStore'


const VIEW_WIDTH  = 100
const VIEW_HEIGHT = 40
const CENTER      = VIEW_HEIGHT / 2
const HALF_HEIGHT = 18
const SEEK_MAX    = 100

/** The no-waveform-yet state: a hairline through the middle, not an empty box. */
const FLAT_HALF = 0.4
const FLAT_PATH = `M0 ${CENTER - FLAT_HALF} L${VIEW_WIDTH} ${CENTER - FLAT_HALF} L${VIEW_WIDTH} ${CENTER + FLAT_HALF} L0 ${CENTER + FLAT_HALF} Z`

const SECONDS_PER_MINUTE = 60
const SECOND_PAD         = 2

function buildWaveformPath (bars: Float32Array | undefined): string {
  if (!bars || bars.length === 0)
    return FLAT_PATH

  const top:    string[] = []
  const bottom: string[] = []

  for (let i = 0; i < bars.length; i++) {
    const x         = i / (bars.length - 1) * VIEW_WIDTH
    const amplitude = Math.max(FLAT_HALF / HALF_HEIGHT, Math.min(1, bars[i] ?? 0))
    const offset    = amplitude * HALF_HEIGHT

    top.push(`${x.toFixed(2)} ${(CENTER - offset).toFixed(2)}`)
    bottom.unshift(`${x.toFixed(2)} ${(CENTER + offset).toFixed(2)}`)
  }

  return `M${top.join(' L')} L${bottom.join(' L')} Z`
}

/** `mm:ss`, floored, and `0:00` for anything not yet known. */
function formatClock (seconds: number): string {
  const safe    = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
  const minutes = Math.floor(safe / SECONDS_PER_MINUTE)
  const rest    = safe % SECONDS_PER_MINUTE

  return `${minutes}:${String(rest).padStart(SECOND_PAD, '0')}`
}

/** The same instant as an ISO-8601 duration, for `<time datetime>`. */
function formatDuration (seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
  return `PT${safe}S`
}

export function Waveform (): ReactElement {
  const stores = useStores()
  const track  = useCurrentTrack()

  const position = useStore(stores.player, state =>
    state.playback.position)
  const duration = useStore(stores.player, state =>
    state.playback.duration)
  const bars = useStore(stores.player, state =>
    track ? state.waveforms.get(track.id) : undefined)

  const progress  = duration > 0 ? position / duration : 0
  const seekValue = Math.round(progress * SEEK_MAX)
  const pathD     = buildWaveformPath(bars)
  const rootRef   = useRef<HTMLDivElement>(null)

  // eslint-disable-next-line react-strict/prefer-no-use-effect -- writes the `--progress` custom property CSS reads for the played-region clip-path; no declarative React API sets a custom property
  useEffect(() => {
    rootRef.current?.style.setProperty('--progress', String(progress))
  })

  function onSeek (event: ChangeEvent<HTMLInputElement>): void {
    const fraction = Number(event.target.value) / SEEK_MAX
    stores.player.dispatch({ type: 'player/seekRequested', position: fraction * duration })
  }

  return <div ref={ rootRef } className="waveform">
    <svg viewBox={ `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}` } preserveAspectRatio="none">
      <path className="wf-unplayed" d={ pathD } />
      <path className="wf-played" d={ pathD } />
    </svg>

    <input type="range" min={ 0 } max={ SEEK_MAX } value={ seekValue } aria-label="Seek" onChange={ onSeek } />

    <footer>
      <time dateTime={ formatDuration(position) }>{formatClock(position)}</time>
      <time dateTime={ formatDuration(duration) }>{formatClock(duration)}</time>
    </footer>
  </div>
}

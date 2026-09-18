/**
 * The seek bar: an SVG waveform (played/unplayed halves split by `--progress`)
 * with a transparent `input[type=range]` on top. `--progress` is a custom
 * property the CSS clip-path reads — set imperatively via `ref.style
 * .setProperty` (the sanctioned way to write a custom property without the
 * banned `style` prop, see AGENTS.md L8's ContextMenu note) in one justified
 * effect, since React has no declarative API for custom properties.
 */
import type { ChangeEvent, ReactElement } from 'react'
import { useEffect, useRef } from 'react'
import { useCurrentTrack } from '../hooks/useCurrentTrack'
import { useStore, useStores } from '../hooks/useStore'


const VIEW_WIDTH  = 100
const VIEW_HEIGHT = 40
const BASELINE    = 20
const SEEK_MAX    = 100

const FLAT_PATH = `M0 ${BASELINE} L${VIEW_WIDTH} ${BASELINE} L${VIEW_WIDTH} ${VIEW_HEIGHT} L0 ${VIEW_HEIGHT} Z`

function buildWaveformPath (bars: Float32Array | undefined): string {
  if (!bars || bars.length === 0)
    return FLAT_PATH

  const points: string[] = []
  for (let i = 0; i < bars.length; i++) {
    const x         = i / (bars.length - 1) * VIEW_WIDTH
    const amplitude = Math.max(0, Math.min(1, bars[i] ?? 0))
    const y         = BASELINE - amplitude * BASELINE
    points.push(`${x.toFixed(2)} ${y.toFixed(2)}`)
  }

  return `M0 ${BASELINE} L${points.join(' L')} L${VIEW_WIDTH} ${BASELINE} L${VIEW_WIDTH} ${VIEW_HEIGHT} L0 ${VIEW_HEIGHT} Z`
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
  </div>
}

/**
 * The player: one markup, rendered twice (the footer bar and the expanded
 * overlay — see AGENTS.md L8's "One DOM" invariant). `expanded` selects only
 * which copy owns the `FrequencyMatrix`'s live wallpaper (`data-live`); every
 * other piece of state — mode, lyrics, whether the overlay itself is open —
 * comes from the shared `ui` store, so both copies render byte-identical
 * markup for the same state (`tests/unit/app/ui/Player.test.tsx`).
 *
 * `FrequencyMatrix` is a direct child rather than part of `.player-content`
 * because the expanded layout puts the mesh in its own grid column beside
 * the chord lane (views.css), which a nested element could not occupy.
 */
import type { ReactElement } from 'react'
import { useCurrentTrack } from '../hooks/useCurrentTrack'
import { useStore, useStores } from '../hooks/useStore'
import { ChordLane } from './ChordLane'
import { Cover } from './Cover'
import { FrequencyMatrix } from './FrequencyMatrix'
import { Icon } from './Icon'
import { Lyrics } from './Lyrics'
import { Readout } from './Readout'
import { Transport } from './Transport'
import { Waveform } from './Waveform'


interface PlayerProps {
  readonly expanded: boolean
}

export function Player ({ expanded }: PlayerProps): ReactElement {
  const stores = useStores()
  const track  = useCurrentTrack()

  const mode        = useStore(stores.ui, state =>
    state.playerMode)
  const lyricsOpen  = useStore(stores.ui, state =>
    state.lyricsOpen)
  const isOverlayOpen = useStore(stores.ui, state =>
    state.overlay === 'player')
  const isDspOpen = useStore(stores.ui, state =>
    state.overlay === 'dsp')

  const isEmpty = track === undefined

  function toggleMode (): void {
    stores.ui.dispatch({ type: 'ui/playerModeSet', mode: mode === 'analysis' ? 'default' : 'analysis' })
  }

  function toggleLyrics (): void {
    stores.ui.dispatch({ type: 'ui/lyricsToggled' })
  }

  function toggleDsp (): void {
    if (isDspOpen)
      stores.ui.dispatch({ type: 'ui/overlayClosed' })
    else
      stores.ui.dispatch({ type: 'ui/overlayOpened', overlay: 'dsp' })
  }

  function toggleExpanded (): void {
    if (isOverlayOpen)
      stores.ui.dispatch({ type: 'ui/overlayClosed' })
    else
      stores.ui.dispatch({ type: 'ui/overlayOpened', overlay: 'player' })
  }

  return <section className="player" data-mode={ mode } data-lyrics={ lyricsOpen } data-empty={ isEmpty || undefined }>
    <Cover />

    <div className="player-info">
      <p className="player-title truncate">{track?.displayTitle ?? ''}</p>
      <p className="player-artist truncate">{track?.artist ?? ''}</p>
      <p className="player-album truncate">{track?.album ?? ''}</p>

      <menu>
        <li>
          <button aria-label="Chord analysis view" aria-pressed={ mode === 'analysis' } onClick={ toggleMode }>
            <Icon name="analysis" />
          </button>
        </li>

        <li>
          <button aria-label="Lyrics" aria-pressed={ lyricsOpen } onClick={ toggleLyrics }>
            <Icon name="lyrics" />
          </button>
        </li>

        <li>
          <button aria-label="Equalizer" aria-pressed={ isDspOpen } onClick={ toggleDsp }>
            <Icon name="sliders" />
          </button>
        </li>

        {/*
          One button, one stable accessible name, two icons: `aria-pressed`
          already says which way it is toggled, and keeping the name fixed
          is what lets the same query reach it whether the overlay is open
          or shut (`scripts/screenshots.ts` toggles it by name both ways).
        */}
        <li>
          <button aria-label="Expand player" aria-pressed={ isOverlayOpen } onClick={ toggleExpanded }>
            <Icon name={ isOverlayOpen ? 'close' : 'expand' } />
          </button>
        </li>
      </menu>
    </div>

    <div className="player-content">
      <ChordLane />
      <Readout />
    </div>

    <FrequencyMatrix expanded={ expanded } />
    <Waveform />
    <Transport />
    <Lyrics />
  </section>
}

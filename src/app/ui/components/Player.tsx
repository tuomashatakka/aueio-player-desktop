/**
 * The player: one markup, rendered twice (the footer bar and the expanded
 * overlay — see AGENTS.md L8's "One DOM" invariant). `expanded` selects only
 * which copy owns the `FrequencyMatrix`'s live wallpaper (`data-live`); every
 * other piece of state — mode, lyrics, whether the overlay itself is open —
 * comes from the shared `ui` store, so both copies render byte-identical
 * markup for the same state (`tests/unit/app/ui/Player.test.tsx`).
 */
import type { ReactElement } from 'react'
import { useCurrentTrack } from '../hooks/useCurrentTrack'
import { useStore, useStores } from '../hooks/useStore'
import { ChordLane } from './ChordLane'
import { Cover } from './Cover'
import { FrequencyMatrix } from './FrequencyMatrix'
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

  const isEmpty     = track === undefined
  const artistAlbum = track ? `${track.artist} — ${track.album}` : ''

  function toggleMode (): void {
    stores.ui.dispatch({ type: 'ui/playerModeSet', mode: mode === 'analysis' ? 'default' : 'analysis' })
  }

  function toggleLyrics (): void {
    stores.ui.dispatch({ type: 'ui/lyricsToggled' })
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
      <p className="truncate">{track?.displayTitle ?? ''}</p>
      <p className="truncate">{artistAlbum}</p>

      <menu>
        <li>
          <button aria-label="Chord analysis view" aria-pressed={ mode === 'analysis' } onClick={ toggleMode }>♪</button>
        </li>

        <li>
          <button aria-label="Lyrics" aria-pressed={ lyricsOpen } onClick={ toggleLyrics }>Aa</button>
        </li>

        <li>
          <button aria-label="Expand player" aria-pressed={ isOverlayOpen } onClick={ toggleExpanded }>⤢</button>
        </li>
      </menu>
    </div>

    <Waveform />

    <div className="player-content">
      <ChordLane />
      <Readout />
      <FrequencyMatrix expanded={ expanded } />
    </div>

    <Transport />
    <Lyrics />
  </section>
}

/** The `<menu class="transport">` of playback buttons. */
import type { ReactElement } from 'react'
import { useStore, useStores } from '../hooks/useStore'
import { Icon } from './Icon'


export function Transport (): ReactElement {
  const stores = useStores()

  const status  = useStore(stores.player, state =>
    state.playback.status)
  const shuffle = useStore(stores.player, state =>
    state.shuffle)
  const repeat  = useStore(stores.player, state =>
    state.repeat)

  const isPlaying = status === 'playing'

  function onShuffle (): void {
    stores.player.dispatch({ type: 'player/shuffleToggled' })
  }

  function onPrevious (): void {
    stores.player.dispatch({ type: 'player/advance', direction: -1 })
  }

  function onPlayPause (): void {
    stores.player.dispatch({ type: 'player/playPauseRequested' })
  }

  function onNext (): void {
    stores.player.dispatch({ type: 'player/advance', direction: 1 })
  }

  function onRepeat (): void {
    stores.player.dispatch({ type: 'player/repeatCycled' })
  }

  return <menu className="transport">
    <li>
      <button aria-label="Shuffle" aria-pressed={ shuffle } onClick={ onShuffle }>
        <Icon name="shuffle" />
      </button>
    </li>

    <li>
      <button aria-label="Previous track" onClick={ onPrevious }>
        <Icon name="previous" />
      </button>
    </li>

    <li>
      <button className="play" aria-label={ isPlaying ? 'Pause' : 'Play' } aria-pressed={ isPlaying } onClick={ onPlayPause }>
        <Icon name={ isPlaying ? 'pause' : 'play' } />
      </button>
    </li>

    <li>
      <button aria-label="Next track" onClick={ onNext }>
        <Icon name="next" />
      </button>
    </li>

    {/* `data-repeat` carries the three-way mode ('none' | 'all' | 'one') CSS keys off. */}
    <li>
      <button aria-label="Repeat" aria-pressed={ repeat !== 'none' } data-repeat={ repeat } onClick={ onRepeat }>
        <Icon name="repeat" />
      </button>
    </li>
  </menu>
}

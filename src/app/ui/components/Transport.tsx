/** The `<menu class="transport">` of playback buttons. */
import type { ReactElement } from 'react'
import { useStore, useStores } from '../hooks/useStore'


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
      <button aria-pressed={ shuffle } onClick={ onShuffle }>⇄</button>
    </li>

    <li>
      <button onClick={ onPrevious }>⏮</button>
    </li>

    <li>
      <button className="play" aria-pressed={ isPlaying } onClick={ onPlayPause }>{isPlaying ? '⏸' : '⏵'}</button>
    </li>

    <li>
      <button onClick={ onNext }>⏭</button>
    </li>

    <li>
      <button data-repeat={ repeat } onClick={ onRepeat }>↻</button>
    </li>
  </menu>
}

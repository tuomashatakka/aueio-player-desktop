/**
 * The transport: loads/plays whatever `playRequested`/`advance` just made
 * current, mirrors the engine's own events back into the player store, and
 * answers `media.command` (OS media keys / the native menu). Repeat `one`
 * re-seeks the same track on `ended` rather than reloading it — see
 * AGENTS.md L6 and `services/audio/engine.ts`.
 */
import { mediaUrl } from './media'
import type { Effect } from './services'
import { tapDispatch } from './tapDispatch'


export const player: Effect = (stores, services) => {
  const { engine } = services

  function loadCurrentIfLoading (): void {
    const playback = stores.player.getState().playback
    if (playback.status !== 'loading' || !playback.trackId)
      return

    engine.load(mediaUrl(playback.trackId))
    void engine.play()
  }

  const untapPlayer = tapDispatch(stores.player, (action, previous) => {
    switch (action.type) {
      case 'player/playRequested':
      case 'player/advance':
        // `advance` with nowhere to go (repeat 'none' at either end of the
        // queue) leaves `state.queue` the same object — see `Queue.next`/
        // `Queue.previous` — so a reference check is how a genuine track
        // change is told apart from a no-op landing on an already-loading state.
        if (previous.queue !== stores.player.getState().queue)
          loadCurrentIfLoading()
        break
      case 'player/seekRequested':
        engine.seek(action.position)
        break
      case 'player/volumeChanged':
        engine.setVolume(action.volume)
        break
      case 'player/dspChanged':
        engine.applyDsp(action.dsp)
        break
      default:
        break
    }
  })

  const offLoading = engine.on('loading', () => {
    stores.player.dispatch({ type: 'player/engineLoading' })
  })

  const offPlaying = engine.on('playing', () => {
    stores.player.dispatch({ type: 'player/engineStarted' })
  })

  const offPaused = engine.on('paused', () => {
    stores.player.dispatch({ type: 'player/enginePaused' })
  })

  const offError = engine.on('error', error => {
    stores.player.dispatch({ type: 'player/engineErrored', message: error.message })
  })

  const offTime = engine.on('time', position => {
    stores.player.dispatch({ type: 'player/engineTime', position, duration: engine.duration })
  })

  const offDuration = engine.on('duration', duration => {
    stores.player.dispatch({ type: 'player/engineTime', position: engine.currentTime, duration })
  })

  const offEnded = engine.on('ended', () => {
    const { repeat } = stores.player.getState()
    stores.player.dispatch({ type: 'player/engineEnded' })

    if (repeat === 'one') {
      engine.seek(0)
      void engine.play()
      return
    }

    stores.player.dispatch({ type: 'player/advance', direction: 1 })
  })

  const offMediaCommand = services.gateway.on('media.command', message => {
    switch (message.command) {
      case 'play-pause': {
        const status = stores.player.getState().playback.status
        if (status === 'playing')
          engine.pause()
        else
          void engine.play()
        break
      }
      case 'next':
        stores.player.dispatch({ type: 'player/advance', direction: 1 })
        break
      case 'previous':
        stores.player.dispatch({ type: 'player/advance', direction: -1 })
        break
      case 'open-library':
        stores.ui.dispatch({ type: 'ui/viewChanged', view: 'library' })
        break
      case 'open-player':
        stores.ui.dispatch({ type: 'ui/overlayOpened', overlay: 'player' })
        break
      case 'open-settings':
        stores.ui.dispatch({ type: 'ui/viewChanged', view: 'settings' })
        break
      default:
        break
    }
  })

  return () => {
    untapPlayer()
    offLoading()
    offPlaying()
    offPaused()
    offError()
    offTime()
    offDuration()
    offEnded()
    offMediaCommand()
  }
}

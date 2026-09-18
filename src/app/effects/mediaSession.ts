/**
 * `navigator.mediaSession` metadata and transport handlers, so OS media keys
 * and lock-screen controls reach the same actions the in-app transport uses.
 * A no-op where the API does not exist (Electrobun's webview today, and
 * every test). See AGENTS.md L6.
 */
import { artUrl } from './media'
import type { Effect } from './services'


export const mediaSession: Effect = (stores, services) => {
  if (typeof navigator === 'undefined' || !navigator.mediaSession || typeof MediaMetadata === 'undefined')
    return (): void => {}

  const session = navigator.mediaSession

  function updateMetadata (): void {
    const trackId = stores.player.getState().playback.trackId
    const track   = trackId ? stores.library.getState().byId.get(trackId) : undefined

    if (!track) {
      session.metadata = null
      return
    }

    session.metadata = new MediaMetadata({
      title:   track.displayTitle,
      artist:  track.artist,
      album:   track.album,
      artwork: track.artId ? [{ src: artUrl(track.artId) }] : [],
    })
  }

  const unsubscribePlayer = stores.player.subscribe(updateMetadata)
  updateMetadata()

  session.setActionHandler('play', () => {
    void services.engine.play()
  })
  session.setActionHandler('pause', () => {
    services.engine.pause()
  })
  session.setActionHandler('previoustrack', () => {
    stores.player.dispatch({ type: 'player/advance', direction: -1 })
  })
  session.setActionHandler('nexttrack', () => {
    stores.player.dispatch({ type: 'player/advance', direction: 1 })
  })
  session.setActionHandler('seekto', details => {
    if (typeof details.seekTime === 'number')
      stores.player.dispatch({ type: 'player/seekRequested', position: details.seekTime })
  })

  return (): void => {
    unsubscribePlayer()
    session.setActionHandler('play', null)
    session.setActionHandler('pause', null)
    session.setActionHandler('previoustrack', null)
    session.setActionHandler('nexttrack', null)
    session.setActionHandler('seekto', null)
  }
}

/**
 * Runs once, at startup: settings, the media origin, the library (paged so
 * the first screen never waits on the whole collection), playlists, then a
 * scan of whatever roots settings came back with. See AGENTS.md L6.
 */
import { PAGE_SIZE } from '../../shared/constants'
import { setMediaOrigin } from './media'
import type { Effect } from './services'


export const bootstrap: Effect = (stores, services) => {
  let disposed = false
  const timers  = new Set<ReturnType<typeof setTimeout>>()

  function schedule (run: () => void): void {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      timers.delete(timer)
      run()
    }, 0)
    timers.add(timer)
  }

  function pageLoop (after?: string): void {
    schedule(() => {
      if (disposed)
        return

      services.gateway.pageTracks({ after, limit: PAGE_SIZE }).then(page => {
        if (disposed)
          return

        stores.library.dispatch({ type: 'library/pageReceived', tracks: page.tracks, total: page.total })
        if (page.next)
          pageLoop(page.next)
      })
        .catch(() => {
        // A page that never arrives leaves the library short, not broken.
        })
    })
  }

  async function run (): Promise<void> {
    const settings = await services.gateway.getSettings()
    if (disposed)
      return
    stores.settings.dispatch({ type: 'settings/loaded', json: settings })

    const origin = await services.gateway.mediaOrigin()
    if (disposed)
      return
    setMediaOrigin(origin)

    pageLoop()

    const playlists = await services.gateway.listPlaylists()
    if (disposed)
      return
    for (const playlist of playlists)
      stores.library.dispatch({ type: 'library/playlistSaved', playlist })

    if (settings.roots.length === 0)
      return

    const { scanId } = await services.gateway.scan(settings.roots)
    if (disposed)
      return
    stores.library.dispatch({ type: 'library/scanStarted', scanId })
  }

  run().catch(() => {
    // Nothing this layer can retry on its own — an unreachable main process
    // leaves settings/library at their defaults, which the UI already renders.
  })

  return (): void => {
    disposed = true
    for (const timer of timers)
      clearTimeout(timer)
    timers.clear()
  }
}

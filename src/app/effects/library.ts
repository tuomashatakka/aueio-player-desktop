/**
 * Wires the scan stream (`scan.batch`/`scan.progress`/`scan.done`/
 * `scan.error`) into the library store, rescans when a root is removed from
 * settings, and fulfils `library/tagsPatchRequested`. See AGENTS.md L6.
 */
import type { TrackJSON } from '../../shared/dto'
import { scheduleFrame } from './frame'
import type { Dispose, Effect } from './services'
import { tapDispatch } from './tapDispatch'


export const library: Effect = (stores, services) => {
  let pending: TrackJSON[]        = []
  let cancelFlush: Dispose | null = null

  function flush (): void {
    cancelFlush = null
    if (pending.length === 0)
      return

    const tracks = pending
    pending = []
    stores.library.dispatch({ type: 'library/batchReceived', tracks })
  }

  function scheduleFlush (): void {
    if (cancelFlush)
      return
    cancelFlush = scheduleFrame(flush)
  }

  const offBatch = services.gateway.on('scan.batch', payload => {
    pending.push(...payload.tracks)
    scheduleFlush()
  })

  const offProgress = services.gateway.on('scan.progress', payload => {
    stores.library.dispatch({
      type: 'library/scanProgress', scanId: payload.scanId, seen: payload.seen, parsed: payload.parsed,
    })
  })

  const offDone = services.gateway.on('scan.done', payload => {
    flush()
    stores.library.dispatch({ type: 'library/scanDone', scanId: payload.scanId, total: payload.total, pruned: payload.pruned })
  })

  const offError = services.gateway.on('scan.error', payload => {
    flush()
    stores.library.dispatch({ type: 'library/scanFailed', scanId: payload.scanId, message: payload.message })
  })

  let previousRoots = stores.settings.getState().settings.roots

  const unsubscribeSettings = stores.settings.subscribe(() => {
    const roots      = stores.settings.getState().settings.roots
    const currentSet = new Set(roots)
    const removed    = previousRoots.filter(root =>
      !currentSet.has(root))
    previousRoots = roots

    if (removed.length === 0)
      return

    services.gateway.forgetRoots(removed).then(() => {
      stores.library.dispatch({ type: 'library/rootsChanged', roots })
      if (roots.length === 0)
        return

      return services.gateway.scan(roots).then(({ scanId }) => {
        stores.library.dispatch({ type: 'library/scanStarted', scanId })
      })
    })
      .catch(() => {
      // The roots list already reflects the user's intent; a failed rescan
      // just leaves the library stale until the next one.
      })
  })

  const untapLibrary = tapDispatch(stores.library, action => {
    if (action.type !== 'library/tagsPatchRequested')
      return

    services.gateway.patchTags(action.id, action.patch).then(track => {
      stores.library.dispatch({ type: 'library/tagsPatched', track })
    })
      .catch(() => {
      // Nothing local to roll back — the store never applied an optimistic patch.
      })
  })

  return () => {
    offBatch()
    offProgress()
    offDone()
    offError()
    unsubscribeSettings()
    untapLibrary()
    cancelFlush?.()
  }
}

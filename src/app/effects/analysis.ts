/**
 * One track's harmony, fetched or computed: `gateway.getAnalysis` first (a
 * cache hit skips the worker entirely), then `analysis.analyze` streaming
 * peaks and the final analysis. A track change aborts whatever the previous
 * one was still doing. See AGENTS.md L6.
 */
import { ANALYSIS_VERSION } from '../../shared/constants'
import { mediaUrl } from './media'
import type { Effect } from './services'


export const analysis: Effect = (stores, services) => {
  let currentId: string | null           = null
  let controller: AbortController | null = null

  function errorMessage (error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }

  async function run (id: string, mtimeMs: number, signal: AbortSignal): Promise<void> {
    let cached: Awaited<ReturnType<typeof services.gateway.getAnalysis>> = null

    try {
      cached = await services.gateway.getAnalysis(id, mtimeMs, ANALYSIS_VERSION)
    }
    catch {
      cached = null
    }

    if (signal.aborted)
      return

    if (cached) {
      stores.player.dispatch({ type: 'player/analysisReceived', id, analysis: cached })
      return
    }

    stores.player.dispatch({ type: 'player/analysisPending', id })

    try {
      for await (const event of services.analysis.analyze(id, mediaUrl(id), signal)) {
        if (signal.aborted)
          return

        if (event.type === 'peaks') {
          stores.player.dispatch({ type: 'player/waveformReceived', id, bars: event.bars })
          continue
        }

        stores.player.dispatch({ type: 'player/analysisReceived', id, analysis: event.analysis })
        await services.gateway.putAnalysis(id, mtimeMs, event.analysis)
      }
    }
    catch (error) {
      if (!signal.aborted)
        stores.player.dispatch({ type: 'player/analysisFailed', id, error: errorMessage(error) })
    }
  }

  const unsubscribe = stores.player.subscribe(() => {
    const { trackId, status } = stores.player.getState().playback
    if (trackId === currentId)
      return

    currentId = trackId
    controller?.abort()
    controller = null

    if (!trackId || status !== 'loading' && status !== 'playing')
      return

    const track          = stores.library.getState().byId.get(trackId)
    const nextController = new AbortController()
    controller = nextController
    void run(trackId, track?.mtimeMs ?? 0, nextController.signal)
  })

  return (): void => {
    unsubscribe()
    controller?.abort()
  }
}

/**
 * Runs one track's analysis: `fetch` the media URL, `decodeAudioData` it on
 * the main thread (native, off-thread inside the browser), downmix to mono,
 * and hand it to the analysis `Worker` (§8). Yields `{ type: 'peaks' }` then
 * `{ type: 'analysis' }` as the worker replies.
 *
 * **Preemption**: every `analyze()` call bumps a version counter; a result
 * that arrives after a newer call has started is dropped rather than
 * yielded, so the current track always wins over one the user already
 * skipped past. `workerFactory` is injected so tests can hand this a fake
 * worker instead of `new Worker(new URL('./analysis.worker.ts', ...))`.
 */
import type { AnalysisJSON } from '../../../shared/dto'
import type { AnalysisRequest, AnalysisWorkerMessage } from './analysis.worker'


export type AnalysisEvent =
  | { readonly type: 'peaks', readonly bars: Float32Array } |
  { readonly type: 'analysis', readonly analysis: AnalysisJSON }

/** The slice of the `Worker` API this client needs — real or faked in tests. */
export interface AnalysisWorkerLike {
  postMessage (message: AnalysisRequest, transfer?: Transferable[]): void
  onmessage: ((event: { data: AnalysisWorkerMessage }) => void) | null
  onerror:   ((event: unknown) => void) | null
  terminate (): void
}

export interface AnalysisClientDeps {
  readonly AudioContext?: new () => AudioContext
  readonly fetch?:        typeof fetch
}

export interface AnalysisClient {
  analyze (id: string, url: string, signal?: AbortSignal): AsyncIterable<AnalysisEvent>
}

function downmix (buffer: AudioBuffer): Float32Array {
  const mono     = new Float32Array(buffer.length)
  const channels = Math.max(1, buffer.numberOfChannels)

  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < data.length; i++)
      mono[i]! += data[i]! / channels
  }

  return mono
}

/** Turns one worker exchange into an async generator, filtered to `id` and preempted by `isStale`. */
async function* workerEvents (
  worker: AnalysisWorkerLike,
  request: AnalysisRequest,
  isStale: () => boolean
): AsyncGenerator<AnalysisEvent> {
  const queue: AnalysisEvent[] = []
  let done                      = false
  let error: Error | null       = null
  let wake: (() => void) | null = null

  worker.onmessage = event => {
    const message = event.data
    if (message.id !== request.id)
      return

    if (message.type === 'peaks')
      queue.push({ type: 'peaks', bars: message.bars })
    else if (message.type === 'analysis') {
      queue.push({ type: 'analysis', analysis: message.analysis })
      done = true
    }
    else {
      error = new Error(message.message)
      done  = true
    }

    wake?.()
    wake = null
  }

  worker.onerror = () => {
    error = error ?? new Error('analysis worker failed')
    done  = true
    wake?.()
    wake = null
  }

  worker.postMessage(request, [ request.mono.buffer ])

  try {
    while (true) {
      while (queue.length > 0) {
        if (isStale())
          return
        yield queue.shift()!
      }

      if (isStale() || done)
        break

      await new Promise<void>(resolve => {
        wake = resolve
      })
    }

    if (!isStale() && error)
      throw error
  }
  finally {
    worker.terminate()
  }
}

export function createAnalysisClient (
  workerFactory: () => AnalysisWorkerLike,
  deps: AnalysisClientDeps = {}
): AnalysisClient {
  let version = 0

  return {
    analyze (id, url, signal) {
      const callVersion = ++version
      const isStale     = () =>
        callVersion !== version || Boolean(signal?.aborted)

      async function* run (): AsyncGenerator<AnalysisEvent> {
        const doFetch     = deps.fetch ?? fetch
        const response    = await doFetch(url, { signal })
        const arrayBuffer = await response.arrayBuffer()
        if (isStale())
          return

        const Ctor    = deps.AudioContext ?? AudioContext
        const context = new Ctor()
        const decoded = await context.decodeAudioData(arrayBuffer)
        if (isStale())
          return

        const mono   = downmix(decoded)
        const worker = workerFactory()

        yield* workerEvents(worker, { id, mono, sampleRate: decoded.sampleRate, duration: decoded.duration }, isStale)
      }

      return run()
    },
  }
}

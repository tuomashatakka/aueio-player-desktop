/**
 * The analysis `Worker`'s entry point. Receives one `{ id, mono, sampleRate,
 * duration }` per track (transferable — `mono`'s buffer is handed over, not
 * copied), and replies with peaks first (§9: "< 50 ms") then the full
 * analysis (seconds). `client.ts` is the only caller; it owns preemption
 * (a newer `analyze()` outranks an older one by id/version), so this file
 * stays a pure request/reply relay with no state of its own.
 *
 * The project's `tsconfig.json` carries only the `DOM` lib (not
 * `WebWorker`, which cannot be combined with it — see `scanner.worker.ts`),
 * so `postMessage`/`onmessage` are redeclared locally with the shapes this
 * worker actually uses, shadowing the ambient `Window`-shaped ones.
 */
import type { AnalysisJSON } from '../../../shared/dto'
import { analyzeAudio } from './analyze'
import { computePeaks } from './peaks'


const PEAK_BARS = 400

declare let onmessage: ((event: { data: AnalysisRequest }) => void) | null

export interface AnalysisRequest {
  readonly id:         string
  readonly mono:       Float32Array
  readonly sampleRate: number
  readonly duration:   number
}

export type AnalysisWorkerMessage =
  | { readonly id: string, readonly type: 'peaks', readonly bars: Float32Array } |
  { readonly id: string, readonly type: 'analysis', readonly analysis: AnalysisJSON } |
  { readonly id: string, readonly type: 'error', readonly message: string }

declare function postMessage (message: AnalysisWorkerMessage, transfer?: Transferable[]): void

const post = (message: AnalysisWorkerMessage, transfer?: Transferable[]): void =>
  transfer ? postMessage(message, transfer) : postMessage(message)

// eslint-disable-next-line prefer-const -- assigns the Worker global scope's ambient `onmessage`, not a real local binding; see the module docstring.
onmessage = (event: { data: AnalysisRequest }) => {
  const { id, mono, sampleRate, duration } = event.data

  try {
    const bars = computePeaks(mono, PEAK_BARS)
    post({ id, type: 'peaks', bars }, [ bars.buffer ])

    const analysis = analyzeAudio(mono, sampleRate, duration)
    post({ id, type: 'analysis', analysis })
  }
  catch (error) {
    post({ id, type: 'error', message: error instanceof Error ? error.message : String(error) })
  }
}

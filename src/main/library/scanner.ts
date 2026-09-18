/**
 * Host-side wrapper around one lazily-created `scanner.worker.ts` `Worker`.
 * `main/rpc/handlers.ts` calls `scan`/`cancel`; the worker's `batch` /
 * `progress` / `done` / `error` messages are relayed to every `onEvent`
 * subscriber (`main/index.ts` turns them into `scan.*` webview messages).
 * See docs/plans/desktop-audio-migration.md §7 and L2.
 */

export type ScanEvent =
  | { type: 'batch', scanId: string, tracks: unknown[] } |
  { type: 'progress', scanId: string, seen: number, parsed: number } |
  { type: 'done', scanId: string, total: number, parsed: number, pruned: string[] } |
  { type: 'error', scanId: string, message: string }

export interface LibraryScanner {
  scan:    (roots: string[]) => string
  cancel:  (scanId: string) => void
  onEvent: (callback: (event: ScanEvent) => void) => () => void
}

let nextScanId = 0

function generateScanId (): string {
  nextScanId += 1
  return `scan-${Date.now().toString(36)}-${nextScanId}`
}

/** `dbPath` is passed to every scan message; `workerUrl` defaults to the real worker module. */
export function createLibraryScanner (
  dbPath: string,
  workerUrl: string | URL = new URL('./scanner.worker.ts', import.meta.url)
): LibraryScanner {
  let worker: Worker | undefined
  const listeners = new Set<(event: ScanEvent) => void>()

  function ensureWorker (): Worker {
    if (worker)
      return worker

    worker = new Worker(workerUrl)
    worker.onmessage = (event: MessageEvent<ScanEvent>) => {
      for (const listener of listeners)
        listener(event.data)
    }
    return worker
  }

  return {
    scan: (roots: string[]): string => {
      const scanId = generateScanId()
      ensureWorker().postMessage({ type: 'scan', scanId, roots, dbPath })
      return scanId
    },
    cancel: (scanId: string): void => {
      worker?.postMessage({ type: 'cancel', scanId })
    },
    onEvent: (callback: (event: ScanEvent) => void): () => void => {
      listeners.add(callback)
      return () =>
        listeners.delete(callback)
    },
  }
}

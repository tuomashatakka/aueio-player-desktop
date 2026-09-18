/**
 * Library scanner. `scanRoots` is the pure, testable walk — it owns its own
 * `bun:sqlite` connection, compares `mtimeMs` against the stored row and
 * only calls into `music-metadata` (via `readTrack`) for files that changed
 * — and the block below it is the thin `Worker` entry point that wires it
 * to `postMessage` when this file is actually run as a `Worker` (guarded by
 * `import.meta.main`, which is only true for the worker's own entry module,
 * never for a test that imports `scanRoots` directly). See
 * docs/plans/desktop-audio-migration.md §7 and L2.
 */
import type { Dirent } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { AUDIO_EXTENSIONS, SCAN_BATCH_SIZE } from '../../shared/constants'
import type { TrackJSON } from '../../shared/dto'
import { openLibrary } from '../db/repository'
import { artIdOf } from './artwork'
import { readTrack } from './metadata'


const PROGRESS_INTERVAL = 200

const AUDIO_EXTENSIONS_SET = new Set<string>(AUDIO_EXTENSIONS)

export interface ScanCallbacks {
  onBatch:    (tracks: TrackJSON[]) => void
  onProgress: (seen: number, parsed: number) => void
}

export interface ScanResult {
  total:  number
  parsed: number
  pruned: string[]
}

type MainMessage =
  | { type: 'scan', scanId: string, roots: string[], dbPath: string } |
  { type: 'cancel', scanId: string }

type WorkerMessage =
  | { type: 'batch', scanId: string, tracks: TrackJSON[] } |
  { type: 'progress', scanId: string, seen: number, parsed: number } |
  { type: 'done', scanId: string, total: number, parsed: number, pruned: string[] } |
  { type: 'error', scanId: string, message: string }

/**
 * Walks `roots`, upserting changed files into the library at `dbPath` and
 * reporting through `callbacks`. `isCancelled` is polled between files, so a
 * cancel takes effect promptly without corrupting an in-flight upsert.
 */
export async function scanRoots (
  roots: readonly string[],
  dbPath: string,
  callbacks: ScanCallbacks,
  isCancelled: () => boolean = () =>
    false
): Promise<ScanResult> {
  const library              = openLibrary(dbPath)
  const seenIds: string[]    = []
  const pending: TrackJSON[] = []
  let seen   = 0
  let parsed = 0

  const flush = () => {
    if (pending.length === 0)
      return
    callbacks.onBatch(pending.splice(0))
  }

  type FileStatType = { size: number, mtimeMs: number }

  const visit = async (filePath: string, fileStat: FileStatType): Promise<void> => {
    const existingMtime = library.mtimeOf(filePath)

    let track: TrackJSON
    if (existingMtime === fileStat.mtimeMs) {
      const stored = library.getByPath(filePath)
      if (!stored)
        return
      track = stored
    }
    else {
      parsed++

      const { track: parsedTrack, picture } = await readTrack(filePath, fileStat)
      if (picture) {
        const artId = artIdOf(picture.bytes)
        if (!library.artwork.has(artId))
          library.artwork.put(artId, picture.mime, picture.bytes)
        parsedTrack.artId = artId
      }
      library.upsertTracks([ parsedTrack ])
      track = parsedTrack
    }

    seenIds.push(filePath)
    pending.push(track)
    seen++
    if (seen % PROGRESS_INTERVAL === 0)
      callbacks.onProgress(seen, parsed)
    if (pending.length >= SCAN_BATCH_SIZE)
      flush()
  }

  const walk = async (dir: string): Promise<void> => {
    let entries: Dirent[]
    try {
      entries = await readdir(dir, { withFileTypes: true })
    }
    catch {
      return
    }

    for (const entry of entries) {
      if (isCancelled())
        return

      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
        continue
      }
      if (!entry.isFile() || !AUDIO_EXTENSIONS_SET.has(path.extname(entry.name).toLowerCase()))
        continue

      try {
        const fileStat = await stat(fullPath)
        await visit(fullPath, fileStat)
      }
      catch {
        // Unreadable file: skip it, the rest of the scan still completes.
      }
    }
  }

  try {
    for (const root of roots) {
      if (isCancelled())
        break
      await walk(root)
    }
    flush()

    const pruned = library.pruneNotIn(roots, seenIds)
    return { total: seen, parsed, pruned }
  }
  finally {
    library.close()
  }
}

// Bun's `Worker` global scope mirrors the browser's (`postMessage`,
// `onmessage`), but the project's `tsconfig.json` only carries the `DOM` lib
// (not `WebWorker`, which cannot be combined with it), so those globals are
// redeclared locally with the shapes this worker actually uses — a
// module-scoped `declare` shadows the ambient (`Window`-shaped) one only
// within this file.
declare function postMessage (message: WorkerMessage): void
declare let onmessage: ((event: { data: MainMessage }) => void) | null

if (import.meta.main) {
  const cancelledScans = new Set<string>()

  const post = (message: WorkerMessage): void =>
    postMessage(message)

  onmessage = (event: { data: MainMessage }) => {
    const message = event.data

    if (message.type === 'cancel') {
      cancelledScans.add(message.scanId)
      return
    }

    const { scanId, roots, dbPath } = message
    scanRoots(
      roots,
      dbPath,
      {
        onBatch: tracks =>
          post({ type: 'batch', scanId, tracks }),
        onProgress: (seenCount, parsedCount) =>
          post({ type: 'progress', scanId, seen: seenCount, parsed: parsedCount }),
      },
      () =>
        cancelledScans.has(scanId)
    )
      .then(({ total, parsed, pruned }) => {
        cancelledScans.delete(scanId)
        post({ type: 'done', scanId, total, parsed, pruned })
      })
      .catch((err: unknown) => {
        cancelledScans.delete(scanId)
        post({ type: 'error', scanId, message: String(err) })
      })
  }
}

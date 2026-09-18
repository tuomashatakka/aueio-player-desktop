/**
 * Coalesces repeated calls to a single run on the next paint — used by
 * `library.ts` (batched `scan.batch` rows) and `appearance.ts` (one custom
 * property write per frame, whatever the mix of settings and palette changes
 * that triggered it). Falls back to `setTimeout(FALLBACK_MS)` where
 * `requestAnimationFrame` does not exist (bun:test's `GlobalScope` — see
 * AGENTS.md's Linting section on why an effect never assumes a browser).
 */

const FALLBACK_MS = 16

type Dispose = () => void

export function scheduleFrame (run: () => void): Dispose {
  if (typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function') {
    const handle = requestAnimationFrame(run)
    return () =>
      cancelAnimationFrame(handle)
  }

  const timer = setTimeout(run, FALLBACK_MS)
  return () =>
    clearTimeout(timer)
}

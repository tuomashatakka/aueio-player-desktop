/**
 * Playback-time formatting. Pure, framework-free — see AGENTS.md L3.
 * Ported from desktop-audio/src/app/utils/time.ts.
 */

/** `m:ss` for a playback position; `0:00` for missing/non-finite input. */
export function formatTime (seconds: number): string {
  if (!seconds || !Number.isFinite(seconds))
    return '0:00'

  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * ISO 8601 duration (`PT3M45S`) for the `datetime` attribute of a `<time>`.
 * The visible text stays `m:ss`; this is the machine-readable half.
 */
export function isoDuration (seconds: number): string {
  if (!seconds || !Number.isFinite(seconds))
    return 'PT0S'

  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `PT${m}M${s}S`
}

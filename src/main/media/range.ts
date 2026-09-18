/**
 * Pure parsing of an HTTP `Range: bytes=…` header against a known content
 * length. Kept separate from `server.ts` so the arithmetic (three range
 * forms, the unsatisfiable case) is unit-testable without a real server.
 * See docs/plans/desktop-audio-migration.md §5 and L2.
 */

const RANGE_PATTERN = /^bytes=(\d*)-(\d*)$/

export type ParsedRange =
  | { kind: 'none' } |
  { kind: 'satisfiable', start: number, end: number } |
  { kind: 'unsatisfiable' }

/**
 * `header` is the raw `Range` request header, or `null`/`undefined` when
 * absent. `size` is the full resource length in bytes. Supports
 * `bytes=a-b`, `bytes=a-` and `bytes=-n` (the last `n` bytes). `start`/`end`
 * on a `satisfiable` result are both inclusive, clamped to `[0, size - 1]`.
 */
export function parseRange (header: string | null | undefined, size: number): ParsedRange {
  if (!header)
    return { kind: 'none' }

  const match = RANGE_PATTERN.exec(header.trim())
  if (!match)
    return { kind: 'none' }

  const [ , startText = '', endText = '' ] = match

  if (size <= 0)
    return { kind: 'unsatisfiable' }

  // `bytes=-n` — the last n bytes.
  if (startText === '') {
    if (endText === '')
      return { kind: 'unsatisfiable' }

    const suffixLength = Number.parseInt(endText, 10)
    if (suffixLength <= 0)
      return { kind: 'unsatisfiable' }

    const start = Math.max(0, size - suffixLength)
    return { kind: 'satisfiable', start, end: size - 1 }
  }

  const start = Number.parseInt(startText, 10)
  if (start >= size)
    return { kind: 'unsatisfiable' }

  // `bytes=a-` — from a to the end.
  const end = endText === '' ? size - 1 : Math.min(size - 1, Number.parseInt(endText, 10))
  if (end < start)
    return { kind: 'unsatisfiable' }

  return { kind: 'satisfiable', start, end }
}

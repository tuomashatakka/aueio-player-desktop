/**
 * The list playback is walking, and where in it we are.
 *
 * Ported from desktop-audio/src/app/contexts/AudioContext.tsx (`pickIndex`,
 * the `history` state and its `MAX_HISTORY` rule). `previous()` differs from
 * the desktop-audio original on purpose: that engine had no history to walk,
 * so "previous" reused the shuffle-aware forward algorithm with the step
 * negated. This `Queue` carries its own `history`, so going back is answering
 * "what was I on before this", not drawing another arbitrary shuffled track —
 * it steps the queue index back by one and never consults `shuffle`/`repeat`.
 */

/** How many played track ids {@link Queue.history} keeps. */
const MAX_HISTORY = 200

export type RepeatMode = 'none' | 'one' | 'all'

/** Direction of travel through the queue, as asked for by the transport. */
type Step = 1 | -1

/** Prepends `id`, deduplicated — a replay moves the id back to the front. */
function recordHistory (history: readonly string[], id: string): readonly string[] {
  return [ id, ...history.filter(existing =>
    existing !== id) ].slice(0, MAX_HISTORY)
}

/**
 * The queue position a step lands on, given shuffle and repeat.
 *
 * Shuffle ignores direction — a shuffled "next" is another arbitrary track,
 * never the one that just played. Repeat `all` wraps at either end; repeat
 * `none` stops there by returning `null`. Repeat `one` is the caller's job —
 * it re-seeks the current track rather than picking a new one.
 */
function pickIndex (
  length: number,
  current: number,
  step: Step,
  shuffle: boolean,
  repeat: RepeatMode
): number | null {
  if (length === 0)
    return null

  if (shuffle) {
    if (length === 1)
      return 0

    // Draw from the other positions so a shuffle never repeats the track
    // that just played.
    const draw = Math.floor(Math.random() * (length - 1))
    return draw >= current ? draw + 1 : draw
  }

  const next = current + step
  if (next >= 0 && next < length)
    return next

  if (repeat === 'all')
    return step > 0 ? 0 : length - 1

  return null
}

export class Queue {
  private constructor (
    readonly items: readonly string[],
    readonly index: number,
    readonly history: readonly string[],
  ) {
    Object.freeze(this)
  }

  static empty (): Queue {
    return new Queue([], -1, [])
  }

  /** The id at the current position, or `null` when the queue is empty. */
  get currentId (): string | null {
    return this.index >= 0 ? this.items[this.index] ?? null : null
  }

  /**
   * Replaces the queue's contents and starts at `startIndex` (clamped into
   * range). History carries over — it is what has actually played, not what
   * any one queue happened to contain.
   */
  withItems (items: readonly string[], startIndex = 0): Queue {
    if (items.length === 0)
      return new Queue([], -1, this.history)

    const index   = Math.max(0, Math.min(startIndex, items.length - 1))
    const id      = items[index]!
    const history = recordHistory(this.history, id)
    return new Queue(items, index, history)
  }

  /** Appends to the queue without disturbing the current position. */
  enqueue (ids: readonly string[]): Queue {
    return ids.length === 0 ? this : new Queue([ ...this.items, ...ids ], this.index, this.history)
  }

  /** One step forward, honouring shuffle and repeat. `null` action if nowhere to go — returns `this` unchanged. */
  next (shuffle: boolean, repeat: RepeatMode): Queue {
    const index = pickIndex(this.items.length, this.index, 1, shuffle, repeat)
    if (index === null)
      return this

    const id = this.items[index]!
    return new Queue(this.items, index, recordHistory(this.history, id))
  }

  /** One step back through the queue's own order. See the module docstring. */
  previous (): Queue {
    if (this.index <= 0)
      return this

    const index = this.index - 1
    const id    = this.items[index]!
    return new Queue(this.items, index, recordHistory(this.history, id))
  }
}

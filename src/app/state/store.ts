/**
 * The one `createStore` helper every slice uses. No middleware, no thunks —
 * async work is an effect that dispatches plain actions back in. See
 * AGENTS.md L4 and docs/plans/desktop-audio-migration.md §3.
 */

export interface Store<S, A extends { type: string }> {
  getState (): S
  dispatch (action: A): void
  subscribe (listener: () => void): () => void
}

/**
 * `dispatch` is re-entrancy safe: an action dispatched from inside a
 * listener (a component effect reacting to the very state it just caused)
 * is queued rather than run inline, so the reducer never re-enters itself
 * mid-update. Each queued action still gets its own reducer pass and its own
 * round of listener notifications — one call per action, whichever call
 * enqueued it.
 */
export function createStore<S, A extends { type: string }> (
  reducer: (state: S, action: A) => S,
  initial: S,
): Store<S, A> {
  let state                        = initial
  let listeners: Array<() => void> = []
  let notifying                    = false
  const pending: A[] = []

  const notify = (): void => {
    for (const listener of listeners.slice())
      listener()
  }

  const dispatch = (action: A): void => {
    pending.push(action)

    if (notifying)
      return

    notifying = true
    try {
      while (pending.length > 0) {
        const next = pending.shift()!
        state = reducer(state, next)
        notify()
      }
    }
    finally {
      notifying = false
    }
  }

  const getState = (): S =>
    state

  const subscribe = (listener: () => void): () => void => {
    listeners.push(listener)

    let disposed = false
    return () => {
      if (disposed)
        return
      disposed  = true
      listeners = listeners.filter(l =>
        l !== listener)
    }
  }

  return { getState, dispatch, subscribe }
}

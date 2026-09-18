/**
 * `Store` (state/store.ts) exposes `getState`/`dispatch`/`subscribe` and
 * nothing else — no middleware, no action stream, `subscribe`'s listener
 * takes no argument. Most effects only need to react to a state *diff*
 * (`store.subscribe` is enough for that), but a few — `player/seekRequested`,
 * `player/volumeChanged`, `library/tagsPatchRequested`,
 * `ui/contextMenuRequested` — carry an intent the reducer does not (and
 * should not) turn into a lasting state change, so there is nothing to diff.
 *
 * `tapDispatch` wraps `store.dispatch` in place so `onAction` also sees every
 * action, once the store has applied it, along with the state as it stood
 * *before* this action — the only way an effect can tell "this action moved
 * the needle" from "this action was a no-op that landed on already-settled
 * state" (`player/advance` with nowhere to go leaves `state.queue` untouched;
 * comparing identity against `previous.queue` is how `player.ts` tells that
 * apart from an `advance` that actually picked a new track).
 *
 * It mutates the same `Store` object every other caller holds (`useDispatch`
 * reads `store.dispatch` fresh each render — see `ui/hooks/useStore.ts`), so
 * this must run once, during `startEffects`, before the tree renders;
 * `dispose` restores whatever `dispatch` was before this tap.
 */
import type { Store } from '../state/store'
import type { Dispose } from './services'


export function tapDispatch<S, A extends { type: string }> (
  store: Store<S, A>,
  onAction: (action: A, previous: S) => void
): Dispose {
  const original = store.dispatch

  store.dispatch = action => {
    const previous = store.getState()
    original(action)
    onAction(action, previous)
  }

  return () => {
    store.dispatch = original
  }
}

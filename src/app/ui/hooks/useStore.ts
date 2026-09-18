/**
 * The bridge between React and `state/`: `useStore` reads a slice through a
 * selector via `useSyncExternalStore`, `useDispatch` hands back a slice's
 * `dispatch`, and `StoresContext`/`useStores` carry the four stores down from
 * `App`. Nothing else in `ui/` is allowed to import `state/` any other way —
 * see AGENTS.md L8.
 */
import { createContext, useContext, useSyncExternalStore } from 'react'
import type { Stores } from '../../state'
import type { Store } from '../../state/store'


/**
 * Reads `selector(store.getState())`, re-rendering only when the store
 * notifies. The snapshot getter is passed twice — once for the client, once
 * as `getServerSnapshot` — because the store already holds its state
 * synchronously in plain JS with no DOM dependency, so there is no separate
 * "server" value to compute; `renderToStaticMarkup`/`renderToString` (used
 * by `tests/unit/app/ui/**`) throw without a third argument.
 */
export function useStore<S, A extends { type: string }, T> (
  store: Store<S, A>,
  selector: (state: S) => T,
): T {
  const getSnapshot = (): T =>
    selector(store.getState())

  return useSyncExternalStore(
    store.subscribe,
    getSnapshot,
    getSnapshot,
  )
}

/** `store.dispatch` — a stable reference, so it is safe in a dependency list. */
export function useDispatch<S, A extends { type: string }> (store: Store<S, A>): (action: A) => void {
  return store.dispatch
}

/** Created once in `App`; every component below it reads the four stores from here. */
export const StoresContext = createContext<Stores | null>(null)

export function useStores (): Stores {
  const stores = useContext(StoresContext)
  if (!stores)
    throw new Error('useStores: no <StoresContext.Provider> above this component')
  return stores
}

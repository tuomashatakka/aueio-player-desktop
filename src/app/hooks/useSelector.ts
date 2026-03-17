import { useCallback, useRef, useSyncExternalStore } from 'react'
import { useStore } from '../context'
import type { PlayerState } from '../state/types'


/**
 * Subscribe to a slice of the store via a selector function.
 * Re-renders only when the selected value changes (by reference).
 */
export const useSelector = <T>(selector: (s: PlayerState) => T): T => {
  const store = useStore()
  const snap = useCallback(() =>
    selector(store.getState()), [ store, selector ])
  return useSyncExternalStore(store.subscribe, snap)
}

/**
 * Same as useSelector, but uses shallow equality for object-returning selectors.
 * Prevents re-renders when reference changes but all values remain equal.
 */
export const useShallowSelector = <T extends Record<string, unknown>>(
  selector: (s: PlayerState) => T
): T => {
  const store = useStore()
  const prevRef = useRef<T | undefined>(undefined)

  const snap = useCallback(() => {
    const next = selector(store.getState())
    const prev = prevRef.current

    if (prev !== undefined && shallowEqual(prev, next))
      return prev

    // eslint-disable-next-line functional/immutable-data
    prevRef.current = next
    return next
  }, [ store, selector ])

  return useSyncExternalStore(store.subscribe, snap)
}

/**
 * Returns store.dispatch — stable reference.
 */
export const useDispatch = () => {
  const store = useStore()
  return store.dispatch
}

// ── Helpers ────────────────────────────────────

const shallowEqual = <T extends Record<string, unknown>>(a: T, b: T): boolean => {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  if (keysA.length !== keysB.length)
    return false

  for (const key of keysA) {
    if (a[key] !== b[key])
      return false
  }

  return true
}

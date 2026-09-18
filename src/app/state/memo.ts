/**
 * Tiny memoisation for selectors. Neither cache grows — each wraps exactly
 * one selector's last call, which is all a `useSyncExternalStore` selector
 * ever needs: the same state reference in yields the same result out.
 */

/** Caches the last call by reference identity of its single argument. */
export function memo1<A, R> (fn: (a: A) => R): (a: A) => R {
  let hasCache = false
  let lastArg: A
  let lastResult: R

  return (a: A): R => {
    if (hasCache && Object.is(a, lastArg))
      return lastResult

    lastResult = fn(a)
    lastArg    = a
    hasCache   = true
    return lastResult
  }
}

/**
 * Caches the last call by a dependency tuple `keyFn` derives from the
 * arguments — each entry compared by reference, like a hook's deps array.
 */
export function memoBy<A extends readonly unknown[], R> (
  fn: (...args: A) => R,
  keyFn: (...args: A) => readonly unknown[],
): (...args: A) => R {
  let hasCache                    = false
  let lastKey: readonly unknown[] = []
  let lastResult: R

  return (...args: A): R => {
    const key  = keyFn(...args)
    const same = hasCache &&
      key.length === lastKey.length &&
      key.every((k, i) =>
        Object.is(k, lastKey[i]))

    if (same)
      return lastResult

    lastResult = fn(...args)
    lastKey    = key
    hasCache   = true
    return lastResult
  }
}

import { describe, expect, test } from 'bun:test'
import { memo1, memoBy } from '../../../../src/app/state/memo'


describe('memo1', () => {
  test('returns the same result — and skips re-running fn — for the same reference twice in a row', () => {
    let calls = 0
    const fn  = memo1((a: readonly number[]) => {
      calls++
      return a.length
    })

    const arg = [ 1, 2, 3 ]
    expect(fn(arg)).toBe(3)
    expect(fn(arg)).toBe(3)
    expect(calls).toBe(1)
  })

  test('re-runs fn when the argument reference changes, even for an equal-by-value array', () => {
    let calls = 0
    const fn  = memo1((a: readonly number[]) => {
      calls++
      return a.length
    })

    fn([ 1, 2, 3 ])
    fn([ 1, 2, 3 ])
    expect(calls).toBe(2)
  })
})

describe('memoBy', () => {
  test('caches on the key tuple, not the raw arguments', () => {
    let calls = 0
    const fn  = memoBy(
      (tracks: readonly number[], search: string) => {
        calls++
        return tracks.length + search.length
      },
      (tracks: readonly number[], search: string) =>
        [ tracks, search ] as const,
    )

    const tracks = [ 1, 2, 3 ]
    fn(tracks, 'abc')
    fn(tracks, 'abc')
    expect(calls).toBe(1)

    fn(tracks, 'ab')
    expect(calls).toBe(2)

    fn([ 1, 2, 3 ], 'ab')
    expect(calls).toBe(3)
  })

  test('returns the same output reference across cached calls', () => {
    const fn = memoBy(
      (a: readonly number[]) =>
        a.map(n =>
          n * 2),
      (a: readonly number[]) =>
        [ a ] as const,
    )

    const arg    = [ 1, 2 ]
    const first  = fn(arg)
    const second = fn(arg)
    expect(second).toBe(first)
  })
})

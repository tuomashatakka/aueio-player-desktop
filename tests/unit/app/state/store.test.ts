import { describe, expect, test } from 'bun:test'
import { createStore } from '../../../../src/app/state/store'


interface CounterState {
  readonly value: number
  readonly log:   readonly string[]
}

type CounterAction =
  | { type: 'increment' } |
  { type: 'incrementTwice' }

function reducer (state: CounterState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'increment':
      return { value: state.value + 1, log: [ ...state.log, 'increment' ]}
    case 'incrementTwice':
      return { value: state.value + 1, log: [ ...state.log, 'incrementTwice' ]}
    default:
      return state
  }
}

describe('createStore', () => {
  test('getState/dispatch/subscribe wire up a basic reducer loop', () => {
    const store = createStore(reducer, { value: 0, log: []})
    expect(store.getState().value).toBe(0)

    store.dispatch({ type: 'increment' })
    expect(store.getState().value).toBe(1)
  })

  test('subscribe notifies listeners after each dispatch, and unsubscribe stops it', () => {
    const store = createStore(reducer, { value: 0, log: []})
    let calls   = 0
    const unsubscribe = store.subscribe(() => {
      calls++
    })

    store.dispatch({ type: 'increment' })
    expect(calls).toBe(1)

    unsubscribe()
    store.dispatch({ type: 'increment' })
    expect(calls).toBe(1)
  })

  test('unsubscribing twice is a harmless no-op', () => {
    const store       = createStore(reducer, { value: 0, log: []})
    const unsubscribe = store.subscribe(() => {})
    unsubscribe()
    expect(() =>
      unsubscribe()).not.toThrow()
  })

  test('re-entrancy: a dispatch made from inside a listener is queued, not run inline', () => {
    const store          = createStore(reducer, { value: 0, log: []})
    const seen: number[] = []

    store.subscribe(() => {
      seen.push(store.getState().value)

      // Dispatching a second action from inside the very listener reacting to
      // the first must not re-enter the reducer mid-update — it queues.
      if (store.getState().value === 1)
        store.dispatch({ type: 'incrementTwice' })
    })

    store.dispatch({ type: 'increment' })

    expect(store.getState().value).toBe(2)
    expect(store.getState().log).toEqual([ 'increment', 'incrementTwice' ])
    expect(seen).toEqual([ 1, 2 ])
  })

  test('each queued action gets its own reducer pass and its own listener round', () => {
    const store = createStore(reducer, { value: 0, log: []})
    let notifications = 0

    store.subscribe(() => {
      notifications++
      if (store.getState().value < 3)
        store.dispatch({ type: 'increment' })
    })

    store.dispatch({ type: 'increment' })

    expect(store.getState().value).toBe(3)
    expect(notifications).toBe(3)
  })
})

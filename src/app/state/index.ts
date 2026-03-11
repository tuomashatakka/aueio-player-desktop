import { reducer } from './reducer'
import type { PlayerState } from './types'
import type { Action } from './actions'


export type Listener = (state: PlayerState) => void

export type Store = {
  readonly getState:  () => PlayerState
  readonly dispatch:  (action: Action) => void
  readonly subscribe: (fn: Listener) => () => void
}

export const createStore = (initialState: PlayerState): Store => {
  // eslint-disable-next-line functional/no-let
  let state = initialState
  const listeners = new Set<Listener>()

  return {
    getState: () =>
      state,

    dispatch: (action: Action) => {
      state = reducer(state, action)
      for (const fn of listeners)
        fn(state)
    },

    subscribe: (fn: Listener) => {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
  }
}

export { initialState } from './types'

export type { PlayerState } from './types'

export type { Action } from './actions'

export { ActionType } from './actions'

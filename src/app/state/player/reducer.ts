/** The player slice's reducer. Pure — see AGENTS.md L4. */
import { Analysis } from '../../domain'
import type { RepeatMode } from '../../domain'
import type { PlayerAction } from './actions'
import type { PlayerState } from './state'


const REPEAT_CYCLE: Record<RepeatMode, RepeatMode> = {
  none: 'all',
  all:  'one',
  one:  'none',
}

function clamp01 (value: number): number {
  return Math.max(0, Math.min(1, value))
}

/** `playback` with `error` dropped — spreading `undefined` over it would leave the key present. */
function withoutError (playback: PlayerState['playback']): PlayerState['playback'] {
  const { error: _error, ...rest } = playback
  return rest
}

export function playerReducer (state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'player/playRequested': {
      const queue = state.queue.withItems(action.ids, action.startIndex)
      return {
        ...state,
        queue,
        playback: {
          ...withoutError(state.playback),
          trackId:  queue.currentId,
          status:   queue.currentId ? 'loading' : 'idle',
          position: 0,
          duration: 0,
        },
      }
    }
    case 'player/engineLoading':
      return { ...state, playback: { ...withoutError(state.playback), status: 'loading' }}
    case 'player/engineStarted':
      return { ...state, playback: { ...withoutError(state.playback), status: 'playing' }}
    case 'player/enginePaused':
      return { ...state, playback: { ...state.playback, status: 'paused' }}
    case 'player/engineEnded':
      return { ...state, playback: { ...state.playback, status: 'idle' }}
    case 'player/engineErrored':
      return { ...state, playback: { ...state.playback, status: 'error', error: action.message }}
    case 'player/engineTime':
      return { ...state, playback: { ...state.playback, position: action.position, duration: action.duration }}
    case 'player/seekRequested':
      return { ...state, playback: { ...state.playback, position: Math.max(0, action.position) }}
    case 'player/volumeChanged':
      return { ...state, playback: { ...state.playback, volume: clamp01(action.volume) }}
    case 'player/shuffleToggled':
      return { ...state, shuffle: !state.shuffle }
    case 'player/repeatCycled':
      return { ...state, repeat: REPEAT_CYCLE[state.repeat] }
    case 'player/advance': {
      const queue = action.direction === 1
        ? state.queue.next(state.shuffle, state.repeat)
        : state.queue.previous()

      if (queue === state.queue)
        return state

      return {
        ...state,
        queue,
        playback: {
          ...withoutError(state.playback),
          trackId:  queue.currentId,
          status:   'loading',
          position: 0,
          duration: 0,
        },
      }
    }

    case 'player/waveformReceived': {
      const waveforms = new Map(state.waveforms)
      waveforms.set(action.id, action.bars)
      return { ...state, waveforms }
    }

    case 'player/analysisPending': {
      const analyses = new Map(state.analyses)
      analyses.set(action.id, 'pending')
      return { ...state, analyses }
    }

    case 'player/analysisReceived': {
      const analyses = new Map(state.analyses)
      analyses.set(action.id, Analysis.fromJSON(action.analysis))
      return { ...state, analyses }
    }

    case 'player/analysisFailed': {
      const analyses = new Map(state.analyses)
      analyses.set(action.id, { error: action.error })
      return { ...state, analyses }
    }
    case 'player/dspChanged':
      return { ...state, dsp: action.dsp }
    default:
      return state
  }
}

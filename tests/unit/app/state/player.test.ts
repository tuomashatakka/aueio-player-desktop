import { describe, expect, test } from 'bun:test'
import { Analysis, Queue } from '../../../../src/app/domain'
import type { PlayerAction } from '../../../../src/app/state/player/actions'
import { playerReducer } from '../../../../src/app/state/player/reducer'
import { selectAnalysis, selectCurrentTrackId, selectProgress, selectWaveform } from '../../../../src/app/state/player/selectors'
import { createPlayerState } from '../../../../src/app/state/player/state'
import type { PlayerState } from '../../../../src/app/state/player/state'


const ANALYSIS_JSON = {
  version: 1, duration: 10, tempo: { bpm: 120, confidence: 1 }, key: { tonic: 'C', scale: 'major' as const, label: 'C major', confidence: 1 }, chords: [],
}

describe('playerReducer', () => {
  const initial = createPlayerState()

  const cases: ReadonlyArray<{ name: string, state: PlayerState, action: PlayerAction, expect: (state: PlayerState) => void }> = [
    {
      name:   'playRequested loads the queue and starts loading the first track',
      state:  initial,
      action: { type: 'player/playRequested', ids: [ 'a', 'b', 'c' ], startIndex: 1 },
      expect: state => {
        expect(state.queue.currentId).toBe('b')
        expect(state.playback.trackId).toBe('b')
        expect(state.playback.status).toBe('loading')
        expect(state.playback.position).toBe(0)
      },
    },
    {
      name:   'playRequested with an empty list goes idle',
      state:  initial,
      action: { type: 'player/playRequested', ids: [], startIndex: 0 },
      expect: state => {
        expect(state.playback.trackId).toBeNull()
        expect(state.playback.status).toBe('idle')
      },
    },
    {
      name:   'engineLoading sets status to loading',
      state:  { ...initial, playback: { ...initial.playback, status: 'idle' }},
      action: { type: 'player/engineLoading' },
      expect: state => {
        expect(state.playback.status).toBe('loading')
      },
    },
    {
      name:   'engineStarted sets status to playing',
      state:  { ...initial, playback: { ...initial.playback, status: 'loading' }},
      action: { type: 'player/engineStarted' },
      expect: state => {
        expect(state.playback.status).toBe('playing')
      },
    },
    {
      name:   'enginePaused sets status to paused',
      state:  { ...initial, playback: { ...initial.playback, status: 'playing' }},
      action: { type: 'player/enginePaused' },
      expect: state => {
        expect(state.playback.status).toBe('paused')
      },
    },
    {
      name:   'engineEnded sets status to idle',
      state:  { ...initial, playback: { ...initial.playback, status: 'playing' }},
      action: { type: 'player/engineEnded' },
      expect: state => {
        expect(state.playback.status).toBe('idle')
      },
    },
    {
      name:   'engineErrored sets status to error with the message',
      state:  initial,
      action: { type: 'player/engineErrored', message: 'decode failed' },
      expect: state => {
        expect(state.playback.status).toBe('error')
        expect(state.playback.error).toBe('decode failed')
      },
    },
    {
      name:   'engineStarted after an error clears it',
      state:  { ...initial, playback: { ...initial.playback, status: 'error', error: 'decode failed' }},
      action: { type: 'player/engineStarted' },
      expect: state => {
        expect(state.playback.error).toBeUndefined()
      },
    },
    {
      name:   'engineTime updates position and duration',
      state:  initial,
      action: { type: 'player/engineTime', position: 12.5, duration: 180 },
      expect: state => {
        expect(state.playback.position).toBe(12.5)
        expect(state.playback.duration).toBe(180)
      },
    },
    {
      name:   'seekRequested clamps to a non-negative position',
      state:  initial,
      action: { type: 'player/seekRequested', position: -5 },
      expect: state => {
        expect(state.playback.position).toBe(0)
      },
    },
    {
      name:   'volumeChanged clamps to 0..1',
      state:  initial,
      action: { type: 'player/volumeChanged', volume: 5 },
      expect: state => {
        expect(state.playback.volume).toBe(1)
      },
    },
    {
      name:   'shuffleToggled flips the flag',
      state:  initial,
      action: { type: 'player/shuffleToggled' },
      expect: state => {
        expect(state.shuffle).toBe(true)
      },
    },
    {
      name:   'repeatCycled: none -> all',
      state:  { ...initial, repeat: 'none' },
      action: { type: 'player/repeatCycled' },
      expect: state => {
        expect(state.repeat).toBe('all')
      },
    },
    {
      name:   'repeatCycled: all -> one',
      state:  { ...initial, repeat: 'all' },
      action: { type: 'player/repeatCycled' },
      expect: state => {
        expect(state.repeat).toBe('one')
      },
    },
    {
      name:   'repeatCycled: one -> none',
      state:  { ...initial, repeat: 'one' },
      action: { type: 'player/repeatCycled' },
      expect: state => {
        expect(state.repeat).toBe('none')
      },
    },
    {
      name:   'advance(1) moves the queue forward and starts loading',
      state:  { ...initial, queue: Queue.empty().withItems([ 'a', 'b' ], 0) },
      action: { type: 'player/advance', direction: 1 },
      expect: state => {
        expect(state.queue.currentId).toBe('b')
        expect(state.playback.trackId).toBe('b')
        expect(state.playback.status).toBe('loading')
      },
    },
    {
      name:   'advance(-1) moves the queue backward',
      state:  { ...initial, queue: Queue.empty().withItems([ 'a', 'b' ], 1) },
      action: { type: 'player/advance', direction: -1 },
      expect: state => {
        expect(state.queue.currentId).toBe('a')
      },
    },
    {
      name:   'advance with nowhere to go leaves playback untouched',
      state:  { ...initial, queue: Queue.empty().withItems([ 'a' ], 0), playback: { ...initial.playback, status: 'playing' }},
      action: { type: 'player/advance', direction: 1 },
      expect: state => {
        expect(state.playback.status).toBe('playing')
      },
    },
    {
      name:   'waveformReceived stores the bars under the id',
      state:  initial,
      action: { type: 'player/waveformReceived', id: 'a', bars: new Float32Array([ 1, 2, 3 ]) },
      expect: state => {
        expect(state.waveforms.get('a')).toEqual(new Float32Array([ 1, 2, 3 ]))
      },
    },
    {
      name:   'analysisPending marks the id pending',
      state:  initial,
      action: { type: 'player/analysisPending', id: 'a' },
      expect: state => {
        expect(state.analyses.get('a')).toBe('pending')
      },
    },
    {
      name:   'analysisReceived stores the parsed Analysis',
      state:  initial,
      action: { type: 'player/analysisReceived', id: 'a', analysis: ANALYSIS_JSON },
      expect: state => {
        expect(state.analyses.get('a')).toBeInstanceOf(Analysis)
      },
    },
    {
      name:   'analysisFailed stores the error',
      state:  initial,
      action: { type: 'player/analysisFailed', id: 'a', error: 'bad file' },
      expect: state => {
        expect(state.analyses.get('a')).toEqual({ error: 'bad file' })
      },
    },
    {
      name:   'dspChanged replaces the dsp settings',
      state:  initial,
      action: { type: 'player/dspChanged', dsp: { eq: { on: true, gains: []}, limiter: { on: false, threshold: -1, release: 1 }}},
      expect: state => {
        expect(state.dsp.eq.on).toBe(true)
      },
    },
  ]

  for (const { name, state, action, expect: assert } of cases)
    test(name, () => {
      assert(playerReducer(state, action))
    })
})

describe('player selectors', () => {
  test('selectCurrentTrackId / selectProgress read straight through', () => {
    const state: PlayerState = { ...createPlayerState(), playback: { ...createPlayerState().playback, trackId: 'a', position: 1, duration: 2 }}
    expect(selectCurrentTrackId(state)).toBe('a')
    expect(selectProgress(state)).toEqual({ position: 1, duration: 2 })
  })

  test('selectWaveform/selectAnalysis are curried by id', () => {
    const bars               = new Float32Array([ 1 ])
    const state: PlayerState = { ...createPlayerState(), waveforms: new Map([[ 'a', bars ]]) }

    expect(selectWaveform('a')(state)).toBe(bars)
    expect(selectWaveform('missing')(state)).toBeUndefined()
    expect(selectAnalysis('missing')(state)).toBeUndefined()
  })
})

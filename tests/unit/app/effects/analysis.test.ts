import { describe, expect, test } from 'bun:test'
import { analysis } from '../../../../src/app/effects/analysis'
import { setMediaOrigin } from '../../../../src/app/effects/media'
import type { Services } from '../../../../src/app/effects/services'
import { createAudioEngine } from '../../../../src/app/services/audio/engine'
import { createStores } from '../../../../src/app/state'
import type { AnalysisEvent } from '../../../../src/app/services/analysis/client'
import type { AnalysisJSON, TrackJSON } from '../../../../src/shared/dto'
import { createFakeAnalysisClient, createFakeKeybindingStore, createFakeRoot, createFakeStorage, createStubGateway } from './helpers'


function wait (ms = 10): Promise<void> {
  return new Promise(resolve =>
    setTimeout(resolve, ms))
}

function track (id: string): TrackJSON {
  return { id, path: id, title: id, artist: '', album: '', duration: 1, format: 'wav', size: 1, coverColor: '#000', mtimeMs: 42 }
}

const ANALYSIS: AnalysisJSON = {
  version: 1, duration: 4, tempo: { bpm: 120, confidence: 1 }, key: { tonic: 'C', scale: 'major', label: 'C major', confidence: 1 }, chords: [],
}

function buildServices (
  gateway: ReturnType<typeof createStubGateway>,
  analysisClient: ReturnType<typeof createFakeAnalysisClient>
): Services {
  return {
    gateway,
    engine:      createAudioEngine(),
    analysis:    analysisClient,
    keybindings: createFakeKeybindingStore(),
    platform:    'web',
    storage:     createFakeStorage(),
    root:        createFakeRoot() as unknown as HTMLElement,
  }
}

describe('analysis', () => {
  test('a cache hit skips the worker entirely', async () => {
    setMediaOrigin({ origin: 'fake://', token: 't' })

    const gateway = createStubGateway({
      getAnalysis: async () =>
        ANALYSIS,
    })
    const analysisClient = createFakeAnalysisClient(async function* () {})

    const stores   = createStores()
    const services = buildServices(gateway, analysisClient)
    const dispose  = analysis(stores, services)

    stores.library.dispatch({ type: 'library/pageReceived', tracks: [ track('a') ], total: 1 })
    stores.player.dispatch({ type: 'player/playRequested', ids: [ 'a' ], startIndex: 0 })

    await wait()

    expect(analysisClient.calls).toEqual([])
    expect(stores.player.getState().analyses.get('a')).toMatchObject({ tempo: { bpm: 120 }})

    dispose()
  })

  test('a cache miss streams peaks then the analysis, and writes it back', async () => {
    setMediaOrigin({ origin: 'fake://', token: 't' })

    const putCalls: unknown[] = []
    const bars                = new Float32Array([ 0.1, 0.2 ])

    const gateway = createStubGateway({
      getAnalysis: async () =>
        null,
      putAnalysis: async (id, mtimeMs, value) => {
        putCalls.push([ id, mtimeMs, value ])
      },
    })

    async function* script (): AsyncGenerator<AnalysisEvent> {
      yield { type: 'peaks', bars }
      yield { type: 'analysis', analysis: ANALYSIS }
    }

    const analysisClient = createFakeAnalysisClient(script)
    const stores         = createStores()
    const services       = buildServices(gateway, analysisClient)
    const dispose        = analysis(stores, services)

    stores.library.dispatch({ type: 'library/pageReceived', tracks: [ track('a') ], total: 1 })
    stores.player.dispatch({ type: 'player/playRequested', ids: [ 'a' ], startIndex: 0 })

    await wait()

    expect(analysisClient.calls).toEqual([ 'a' ])
    expect(stores.player.getState().waveforms.get('a')).toBe(bars)
    expect(stores.player.getState().analyses.get('a')).toMatchObject({ tempo: { bpm: 120 }})
    expect(putCalls).toEqual([[ 'a', 42, ANALYSIS ]])

    dispose()
  })

  test('switching tracks aborts the previous analysis run', async () => {
    setMediaOrigin({ origin: 'fake://', token: 't' })

    const abortedIds: string[] = []

    const gateway = createStubGateway({
      getAnalysis: async () =>
        null,
    })

    function script (id: string): AsyncGenerator<AnalysisEvent> {
      async function* run (): AsyncGenerator<AnalysisEvent> {
        try {
          await new Promise(() => {}) // never resolves on its own
          yield { type: 'analysis', analysis: ANALYSIS }
        }
        finally {
          abortedIds.push(id)
        }
      }
      return run()
    }

    const analysisClient = createFakeAnalysisClient(script)
    const stores         = createStores()
    const services       = buildServices(gateway, analysisClient)
    const dispose        = analysis(stores, services)

    stores.library.dispatch({
      type: 'library/pageReceived', tracks: [ track('a'), track('b') ], total: 2,
    })
    stores.player.dispatch({ type: 'player/playRequested', ids: [ 'a', 'b' ], startIndex: 0 })
    await wait()

    stores.player.dispatch({ type: 'player/advance', direction: 1 })
    await wait()

    expect(analysisClient.calls).toEqual([ 'a', 'b' ])
    expect(stores.player.getState().analyses.get('a')).toBe('pending')

    dispose()
  })
})

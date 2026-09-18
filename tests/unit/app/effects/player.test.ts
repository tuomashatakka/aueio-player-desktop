import { describe, expect, test } from 'bun:test'
import { player } from '../../../../src/app/effects/player'
import { setMediaOrigin } from '../../../../src/app/effects/media'
import type { Services } from '../../../../src/app/effects/services'
import { buildMediaUrl } from '../../../../src/app/services/gateway/Gateway'
import { createStores } from '../../../../src/app/state'
import { createFakeEngine, createFakeKeybindingStore, createFakeRoot, createFakeStorage, createStubGateway } from './helpers'


const ORIGIN = { origin: 'fake://', token: 't' }

function buildServices (gateway: ReturnType<typeof createStubGateway>, engine: ReturnType<typeof createFakeEngine>): Services {
  return {
    gateway,
    engine,
    analysis:    { analyze: async function* () {} },
    keybindings: createFakeKeybindingStore(),
    platform:    'web',
    storage:     createFakeStorage(),
    root:        createFakeRoot() as unknown as HTMLElement,
  }
}

describe('player', () => {
  test('playRequested loads and plays the resolved track', () => {
    setMediaOrigin(ORIGIN)

    const gateway  = createStubGateway()
    const engine   = createFakeEngine()
    const stores   = createStores()
    const services = buildServices(gateway, engine)
    const dispose  = player(stores, services)

    stores.player.dispatch({ type: 'player/playRequested', ids: [ 'a', 'b' ], startIndex: 0 })

    expect(engine.loadCalls).toEqual([ buildMediaUrl(ORIGIN, 'a') ])
    expect(engine.playCalls).toBe(1)

    dispose()
  })

  test('advance with nowhere to go never reloads the engine', () => {
    setMediaOrigin(ORIGIN)

    const gateway  = createStubGateway()
    const engine   = createFakeEngine()
    const stores   = createStores()
    const services = buildServices(gateway, engine)
    const dispose  = player(stores, services)

    // A single-item queue: "previous" has nowhere to go, the reducer leaves
    // `state.queue` untouched, and the tap must not treat that as a new load.
    stores.player.dispatch({ type: 'player/playRequested', ids: [ 'solo' ], startIndex: 0 })
    engine.loadCalls.length = 0
    engine.playCalls        = 0

    stores.player.dispatch({ type: 'player/advance', direction: -1 })

    expect(engine.loadCalls).toEqual([])
    expect(engine.playCalls).toBe(0)

    dispose()
  })

  test('seekRequested/volumeChanged/dspChanged forward straight to the engine', () => {
    setMediaOrigin(ORIGIN)

    const gateway  = createStubGateway()
    const engine   = createFakeEngine()
    const stores   = createStores()
    const services = buildServices(gateway, engine)
    const dispose  = player(stores, services)

    stores.player.dispatch({ type: 'player/seekRequested', position: 12 })
    stores.player.dispatch({ type: 'player/volumeChanged', volume: 0.3 })

    expect(engine.seekCalls).toEqual([ 12 ])
    expect(engine.volumeCalls).toEqual([ 0.3 ])

    dispose()
  })

  test('engine events mirror into the player store', () => {
    setMediaOrigin(ORIGIN)

    const gateway  = createStubGateway()
    const engine   = createFakeEngine()
    const stores   = createStores()
    const services = buildServices(gateway, engine)
    const dispose  = player(stores, services)

    engine.emit('loading', undefined)
    expect(stores.player.getState().playback.status).toBe('loading')

    engine.emit('playing', undefined)
    expect(stores.player.getState().playback.status).toBe('playing')

    engine.emit('time', 1.5)
    expect(stores.player.getState().playback.position).toBe(1.5)

    dispose()
  })

  test('ended with repeat "one" re-seeks the same track instead of advancing', () => {
    setMediaOrigin(ORIGIN)

    const gateway  = createStubGateway()
    const engine   = createFakeEngine()
    const stores   = createStores()
    const services = buildServices(gateway, engine)
    const dispose  = player(stores, services)

    stores.player.dispatch({ type: 'player/playRequested', ids: [ 'a', 'b' ], startIndex: 0 })
    stores.player.dispatch({ type: 'player/repeatCycled' }) // none -> all
    stores.player.dispatch({ type: 'player/repeatCycled' }) // all -> one
    expect(stores.player.getState().repeat).toBe('one')

    engine.loadCalls.length = 0
    engine.playCalls        = 0

    engine.emit('ended', undefined)

    expect(stores.player.getState().playback.trackId).toBe('a')
    expect(engine.seekCalls).toEqual([ 0 ])
    expect(engine.playCalls).toBe(1)
    expect(engine.loadCalls).toEqual([])

    dispose()
  })

  test('ended without repeat "one" advances the queue and loads the next track', () => {
    setMediaOrigin(ORIGIN)

    const gateway  = createStubGateway()
    const engine   = createFakeEngine()
    const stores   = createStores()
    const services = buildServices(gateway, engine)
    const dispose  = player(stores, services)

    stores.player.dispatch({ type: 'player/playRequested', ids: [ 'a', 'b' ], startIndex: 0 })
    engine.loadCalls.length = 0

    engine.emit('ended', undefined)

    expect(stores.player.getState().playback.trackId).toBe('b')
    expect(engine.loadCalls).toEqual([ buildMediaUrl(ORIGIN, 'b') ])

    dispose()
  })

  test('media.command drives play-pause/next/previous and the ui overlays', () => {
    setMediaOrigin(ORIGIN)

    const gateway  = createStubGateway()
    const engine   = createFakeEngine()
    const stores   = createStores()
    const services = buildServices(gateway, engine)
    const dispose  = player(stores, services)

    stores.player.dispatch({ type: 'player/playRequested', ids: [ 'a', 'b' ], startIndex: 0 })

    gateway.emit('media.command', { command: 'open-player' })
    expect(stores.ui.getState().overlay).toBe('player')

    gateway.emit('media.command', { command: 'next' })
    expect(stores.player.getState().playback.trackId).toBe('b')

    dispose()
  })
})

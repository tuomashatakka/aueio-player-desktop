import { describe, expect, test } from 'bun:test'
import { library } from '../../../../src/app/effects/library'
import type { Services } from '../../../../src/app/effects/services'
import { createAudioEngine } from '../../../../src/app/services/audio/engine'
import { createStores } from '../../../../src/app/state'
import { DEFAULT_SETTINGS } from '../../../../src/shared/settings'
import type { TrackJSON } from '../../../../src/shared/dto'
import { createFakeKeybindingStore, createFakeRoot, createFakeStorage, createStubGateway } from './helpers'


function wait (ms = 20): Promise<void> {
  return new Promise(resolve =>
    setTimeout(resolve, ms))
}

function track (id: string): TrackJSON {
  return { id, path: id, title: id, artist: '', album: '', duration: 1, format: 'wav', size: 1, coverColor: '#000', mtimeMs: 0 }
}

function buildServices (gateway: ReturnType<typeof createStubGateway>): Services {
  return {
    gateway,
    engine:      createAudioEngine(),
    analysis:    { analyze: async function* () {} },
    keybindings: createFakeKeybindingStore(),
    platform:    'web',
    storage:     createFakeStorage(),
    root:        createFakeRoot() as unknown as HTMLElement,
  }
}

describe('library', () => {
  test('scan.batch messages within one frame coalesce into a single library/batchReceived', async () => {
    const gateway  = createStubGateway()
    const stores   = createStores()
    const services = buildServices(gateway)
    const dispose  = library(stores, services)

    let notifications = 0
    stores.library.subscribe(() => {
      notifications++
    })

    gateway.emit('scan.batch', { scanId: 's1', tracks: [ track('a'), track('b') ]})
    gateway.emit('scan.batch', { scanId: 's1', tracks: [ track('c') ]})

    // Nothing lands synchronously — it's coalesced to the next frame.
    expect(stores.library.getState().order.length).toBe(0)

    await wait()

    expect(stores.library.getState().order).toEqual([ 'a', 'b', 'c' ])
    expect(notifications).toBe(1)

    dispose()
  })

  test('scan.done flushes any pending batch first, then marks the scan done', async () => {
    const gateway  = createStubGateway()
    const stores   = createStores()
    const services = buildServices(gateway)
    const dispose  = library(stores, services)

    stores.library.dispatch({ type: 'library/scanStarted', scanId: 's1' })
    gateway.emit('scan.batch', { scanId: 's1', tracks: [ track('a') ]})
    gateway.emit('scan.done', { scanId: 's1', total: 1, pruned: []})

    expect(stores.library.getState().order).toEqual([ 'a' ])
    expect(stores.library.getState().scan.status).toBe('done')

    dispose()
  })

  test('scan.progress and scan.error dispatch immediately, uncoalesced', () => {
    const gateway  = createStubGateway()
    const stores   = createStores()
    const services = buildServices(gateway)
    const dispose  = library(stores, services)

    stores.library.dispatch({ type: 'library/scanStarted', scanId: 's1' })
    gateway.emit('scan.progress', { scanId: 's1', seen: 10, parsed: 4 })
    expect(stores.library.getState().scan.seen).toBe(10)

    gateway.emit('scan.error', { scanId: 's1', message: 'boom' })
    expect(stores.library.getState().scan.status).toBe('error')

    dispose()
  })

  test('a root removed from settings forgets it and rescans the rest', async () => {
    const forgotten: string[][] = []
    const scanned: string[][]   = []

    const gateway = createStubGateway({
      forgetRoots: async roots => {
        forgotten.push([ ...roots ])
        return { removed: roots.length }
      },
      scan: async roots => {
        scanned.push([ ...roots ])
        return { scanId: 'rescan' }
      },
    })

    const stores   = createStores()
    const services = buildServices(gateway)
    stores.settings.dispatch({ type: 'settings/loaded', json: { ...DEFAULT_SETTINGS, roots: [ '/a', '/b' ]}})

    const dispose = library(stores, services)

    stores.settings.dispatch({ type: 'settings/changed', patch: { roots: [ '/b' ]}})
    await wait()

    expect(forgotten).toEqual([[ '/a' ]])
    expect(scanned).toEqual([[ '/b' ]])
    expect(stores.library.getState().roots).toEqual([ '/b' ])

    dispose()
  })

  test('library/tagsPatchRequested calls gateway.patchTags and folds the result into tagsPatched', async () => {
    const patched: unknown[] = []

    const gateway = createStubGateway({
      patchTags: async (id, patch) => {
        patched.push([ id, patch ])
        return track(id)
      },
    })

    const stores   = createStores()
    const services = buildServices(gateway)
    stores.library.dispatch({ type: 'library/pageReceived', tracks: [ track('a') ], total: 1 })

    const dispose = library(stores, services)

    stores.library.dispatch({ type: 'library/tagsPatchRequested', id: 'a', patch: { rating: 5 }})
    await wait()

    expect(patched).toEqual([[ 'a', { rating: 5 }]])
    expect(stores.library.getState().byId.get('a')?.title).toBe('a')

    dispose()
  })
})

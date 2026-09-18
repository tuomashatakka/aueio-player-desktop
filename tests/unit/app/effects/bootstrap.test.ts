import { describe, expect, test } from 'bun:test'
import { bootstrap } from '../../../../src/app/effects/bootstrap'
import { mediaUrl, setMediaOrigin } from '../../../../src/app/effects/media'
import type { Services } from '../../../../src/app/effects/services'
import { DEFAULT_FAKE_TRACKS, FakeGateway } from '../../../../src/app/services/gateway/FakeGateway'
import { createAudioEngine } from '../../../../src/app/services/audio/engine'
import { createStores } from '../../../../src/app/state'
import { DEFAULT_SETTINGS } from '../../../../src/shared/settings'
import { createFakeKeybindingStore, createFakeRoot, createFakeStorage } from './helpers'


function wait (ms = 0): Promise<void> {
  return new Promise(resolve =>
    setTimeout(resolve, ms))
}

function buildServices (gateway: FakeGateway): Services {
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

describe('bootstrap', () => {
  test('the startup sequence: settings, media origin, paged library, playlists, then a scan', async () => {
    setMediaOrigin(null)

    const gateway = new FakeGateway()
    await gateway.saveSettings({ ...DEFAULT_SETTINGS, roots: [ '/music' ]})
    await gateway.savePlaylist({ id: 'p1', name: 'Late Night', icon: 'moon', trackIds: []})

    const stores   = createStores()
    const services = buildServices(gateway)

    const dispose = bootstrap(stores, services)

    // The page loop is a `setTimeout(0)` chain; give it a few ticks to settle.
    await wait()
    await wait()
    await wait()

    expect(stores.settings.getState().ready).toBe(true)
    expect(stores.settings.getState().settings.roots).toEqual([ '/music' ])

    expect(stores.library.getState().order.length).toBe(DEFAULT_FAKE_TRACKS.length)
    expect(stores.library.getState().playlists.has('p1')).toBe(true)

    // Media origin warmed the shared cache synchronously usable elsewhere.
    expect(mediaUrl('abc')).toBe('fake:///media/abc?t=fake')

    // Roots were non-empty, so bootstrap kicked off a scan.
    expect(stores.library.getState().scan.status).toBe('scanning')

    dispose()
  })

  test('an empty roots list never starts a scan', async () => {
    setMediaOrigin(null)

    const gateway  = new FakeGateway()
    const stores   = createStores()
    const services = buildServices(gateway)

    const dispose = bootstrap(stores, services)
    await wait()
    await wait()

    expect(stores.library.getState().scan.status).toBe('idle')
    dispose()
  })

  test('dispose stops the page loop from dispatching further pages', async () => {
    setMediaOrigin(null)

    const gateway  = new FakeGateway()
    const stores   = createStores()
    const services = buildServices(gateway)

    const dispose = bootstrap(stores, services)
    dispose()
    await wait()
    await wait()

    // Disposed before any timer fired — nothing should have loaded.
    expect(stores.settings.getState().ready).toBe(false)
    expect(stores.library.getState().order.length).toBe(0)
  })
})

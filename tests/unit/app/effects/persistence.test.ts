import { describe, expect, test } from 'bun:test'
import { persistence } from '../../../../src/app/effects/persistence'
import type { Services } from '../../../../src/app/effects/services'
import { createAudioEngine } from '../../../../src/app/services/audio/engine'
import { createStores } from '../../../../src/app/state'
import { DEFAULT_SETTINGS } from '../../../../src/shared/settings'
import { createFakeKeybindingStore, createFakeRoot, createFakeStorage, createStubGateway } from './helpers'


function wait (ms = 320): Promise<void> {
  return new Promise(resolve =>
    setTimeout(resolve, ms))
}

function buildServices (storage: ReturnType<typeof createFakeStorage>, gateway: ReturnType<typeof createStubGateway>): Services {
  return {
    gateway,
    engine:      createAudioEngine(),
    analysis:    { analyze: async function* () {} },
    keybindings: createFakeKeybindingStore(),
    platform:    'web',
    storage,
    root:        createFakeRoot() as unknown as HTMLElement,
  }
}

describe('persistence', () => {
  test('hydrates the ui slice from storage on start, reconciling columns', () => {
    const storage = createFakeStorage()
    storage.data.set('aueio-ui', JSON.stringify({
      density: 'compact', sidebarOpen: false, columns: [{ key: 'title', width: '2fr', resizable: false, visible: true }],
    }))

    const gateway  = createStubGateway()
    const stores   = createStores()
    const services = buildServices(storage, gateway)
    const dispose  = persistence(stores, services)

    expect(stores.ui.getState().density).toBe('compact')
    expect(stores.ui.getState().sidebarOpen).toBe(false)
    // Reconciled: a column `DEFAULT_COLUMNS` knows that the saved blob
    // dropped (e.g. `art`) is appended back in, not lost.
    expect(stores.ui.getState().columns.some(c =>
      c.key === 'art')).toBe(true)

    dispose()
  })

  test('a ui change persists the relevant subset, not the whole slice', () => {
    const storage  = createFakeStorage()
    const gateway  = createStubGateway()
    const stores   = createStores()
    const services = buildServices(storage, gateway)
    const dispose  = persistence(stores, services)

    stores.ui.dispatch({ type: 'ui/sidebarToggled' })

    const saved = JSON.parse(storage.data.get('aueio-ui') ?? '{}')
    expect(saved.sidebarOpen).toBe(false)
    expect(saved.density).toBe('normal')

    dispose()
  })

  test('settings/changed saves debounced -- rapid changes coalesce into one gateway.saveSettings', async () => {
    const saveCalls: unknown[] = []
    const gateway              = createStubGateway({
      saveSettings: async settings => {
        saveCalls.push(settings)
      },
    })

    const storage  = createFakeStorage()
    const stores   = createStores()
    const services = buildServices(storage, gateway)
    stores.settings.dispatch({ type: 'settings/loaded', json: DEFAULT_SETTINGS })

    const dispose = persistence(stores, services)

    stores.settings.dispatch({ type: 'settings/changed', patch: { fontScale: 1.1 }})
    stores.settings.dispatch({ type: 'settings/changed', patch: { fontScale: 1.2 }})

    expect(saveCalls.length).toBe(0) // debounced -- nothing yet

    await wait()

    expect(saveCalls.length).toBe(1)
    expect((saveCalls[0] as typeof DEFAULT_SETTINGS).fontScale).toBe(1.2)

    dispose()
  })

  test('settings/loaded never triggers a save', async () => {
    const saveCalls: unknown[] = []
    const gateway              = createStubGateway({
      saveSettings: async settings => {
        saveCalls.push(settings)
      },
    })

    const storage  = createFakeStorage()
    const stores   = createStores()
    const services = buildServices(storage, gateway)
    const dispose  = persistence(stores, services)

    stores.settings.dispatch({ type: 'settings/loaded', json: DEFAULT_SETTINGS })
    await wait()

    expect(saveCalls.length).toBe(0)
    dispose()
  })
})

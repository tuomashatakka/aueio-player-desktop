import { describe, expect, test } from 'bun:test'
import { appearance } from '../../../../src/app/effects/appearance'
import type { Services } from '../../../../src/app/effects/services'
import { createAudioEngine } from '../../../../src/app/services/audio/engine'
import { createStores } from '../../../../src/app/state'
import { DEFAULT_SETTINGS } from '../../../../src/shared/settings'
import { createFakeKeybindingStore, createFakeRoot, createFakeStorage, createStubGateway } from './helpers'


function wait (ms = 20): Promise<void> {
  return new Promise(resolve =>
    setTimeout(resolve, ms))
}

function buildServices (root: ReturnType<typeof createFakeRoot>): Services {
  return {
    gateway:     createStubGateway(),
    engine:      createAudioEngine(),
    analysis:    { analyze: async function* () {} },
    keybindings: createFakeKeybindingStore(),
    platform:    'web',
    storage:     createFakeStorage(),
    root:        root as unknown as HTMLElement,
  }
}

describe('appearance', () => {
  test('several settings changes inside one tick still write --accent exactly once', async () => {
    const root     = createFakeRoot()
    const stores   = createStores()
    const services = buildServices(root)
    const dispose  = appearance(stores, services)

    let writes = 0
    const originalSetProperty = root.style.setProperty
    root.style.setProperty    = (name, value) => {
      if (name === '--accent')
        writes++
      originalSetProperty(name, value)
    }

    stores.settings.dispatch({ type: 'settings/loaded', json: DEFAULT_SETTINGS })
    stores.settings.dispatch({ type: 'settings/changed', patch: { fontScale: 1.1 }})
    stores.settings.dispatch({ type: 'settings/changed', patch: { theme: 'light' }})

    await wait()

    expect(writes).toBe(1)
    expect(root.attributes.get('data-theme')).toBe('light')
    expect(root.style.fontSize).toBe('17.6px')

    dispose()
  })

  test('accentSource "custom" writes the settings accent colour straight through', async () => {
    const root     = createFakeRoot()
    const stores   = createStores()
    const services = buildServices(root)
    const dispose  = appearance(stores, services)

    stores.settings.dispatch({
      type: 'settings/loaded',
      json: { ...DEFAULT_SETTINGS, accentSource: 'custom', accentColor: '#ffffff' },
    })

    await wait()

    // White against the dark #0f0f11 default background already clears
    // contrast, so contrastLift returns it unchanged.
    expect(root.properties.get('--accent')).toBe('rgb(255 255 255)')
    expect(root.properties.get('--accent-contrast')).toBe('rgb(15 15 17)')

    dispose()
  })

  test('a no-op update never touches the DOM', () => {
    const root     = createFakeRoot()
    const stores   = createStores()
    const services = buildServices(root)
    const dispose  = appearance(stores, services)

    dispose()
    expect(root.attributes.size).toBe(0)
  })
})

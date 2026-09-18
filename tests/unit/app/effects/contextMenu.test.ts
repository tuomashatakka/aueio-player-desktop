import { describe, expect, test } from 'bun:test'
import { contextMenu } from '../../../../src/app/effects/contextMenu'
import type { Platform, Services } from '../../../../src/app/effects/services'
import { createAudioEngine } from '../../../../src/app/services/audio/engine'
import { createStores } from '../../../../src/app/state'
import { createFakeKeybindingStore, createFakeRoot, createFakeStorage, createStubGateway } from './helpers'


function buildServices (gateway: ReturnType<typeof createStubGateway>, platform: Platform): Services {
  return {
    gateway,
    engine:      createAudioEngine(),
    analysis:    { analyze: async function* () {} },
    keybindings: createFakeKeybindingStore(),
    platform,
    storage:     createFakeStorage(),
    root:        createFakeRoot() as unknown as HTMLElement,
  }
}

describe('contextMenu', () => {
  test('on macos, ui/contextMenuRequested opens the native menu', () => {
    const calls: unknown[] = []
    const gateway          = createStubGateway({
      showContextMenu: async (menuId, items) => {
        calls.push([ menuId, items ])
      },
    })

    const stores   = createStores()
    const services = buildServices(gateway, 'macos')
    const dispose  = contextMenu(stores, services)

    stores.ui.dispatch({ type: 'ui/contextMenuRequested', menuId: 'track-row', items: [{ id: 'play', label: 'Play' }], x: 1, y: 2 })

    expect(calls).toEqual([[ 'track-row', [{ id: 'play', label: 'Play' }]]])

    dispose()
  })

  test('on linux/web, ui/contextMenuRequested never calls the gateway', () => {
    const calls: unknown[] = []
    const gateway          = createStubGateway({
      showContextMenu: async (menuId, items) => {
        calls.push([ menuId, items ])
      },
    })

    const stores   = createStores()
    const services = buildServices(gateway, 'linux')
    const dispose  = contextMenu(stores, services)

    stores.ui.dispatch({ type: 'ui/contextMenuRequested', menuId: 'track-row', items: [], x: 0, y: 0 })

    expect(calls).toEqual([])

    dispose()
  })

  test('menu.action folds into contextMenuActioned + contextMenuClosed', () => {
    const gateway  = createStubGateway()
    const stores   = createStores()
    const services = buildServices(gateway, 'macos')
    const dispose  = contextMenu(stores, services)

    stores.ui.dispatch({
      type: 'ui/contextMenuRequested', menuId: 'track-row', items: [{ id: 'play', label: 'Play' }], x: 0, y: 0,
    })
    gateway.emit('menu.action', { menuId: 'track-row', actionId: 'play' })

    expect(stores.ui.getState().contextMenu).toBeNull()

    dispose()
  })

  test('windowCommandRequested and rootPickRequested reach the gateway on every platform', async () => {
    const commands: unknown[] = []
    const gateway             = createStubGateway({
      windowCommand: async command => {
        commands.push(command)
      },
      pickRoot: async () =>
        '/new/root',
    })

    const stores   = createStores()
    const services = buildServices(gateway, 'web')
    const dispose  = contextMenu(stores, services)

    stores.ui.dispatch({ type: 'ui/windowCommandRequested', command: 'minimize' })
    expect(commands).toEqual([ 'minimize' ])

    stores.ui.dispatch({ type: 'ui/rootPickRequested' })
    await new Promise(resolve =>
      setTimeout(resolve, 10))

    expect(stores.settings.getState().settings.roots).toEqual([ '/new/root' ])

    dispose()
  })
})

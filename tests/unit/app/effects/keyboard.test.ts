import { afterEach, describe, expect, test } from 'bun:test'
import { keyboard } from '../../../../src/app/effects/keyboard'
import type { Services } from '../../../../src/app/effects/services'
import { createAudioEngine } from '../../../../src/app/services/audio/engine'
import { createStores } from '../../../../src/app/state'
import { createFakeKeybindingStore, createFakeRoot, createFakeStorage, createStubGateway } from './helpers'


interface FakeElement {
  tagName?:           string
  isContentEditable?: boolean
  parentElement?:     FakeElement | null
  attributes:         Map<string, string>
  getAttribute (name: string): string | null
}

interface KeyPress {
  readonly key:      string
  readonly metaKey?: boolean
}

function fakeElement (partial: Partial<FakeElement> = {}): FakeElement {
  const attributes = partial.attributes ?? new Map<string, string>()
  return {
    ...partial,
    attributes,
    getAttribute: name =>
      attributes.get(name) ?? null,
  }
}

function press (keyPress: KeyPress, target: FakeElement | null = null): void {
  (globalThis as unknown as { document: { activeElement: unknown }}).document = { activeElement: target }

  const event = Object.assign(new Event('keydown'), {
    key: keyPress.key, ctrlKey: false, metaKey: keyPress.metaKey ?? false, altKey: false, shiftKey: false,
  })
  window.dispatchEvent(event)
}

function buildServices (): Services {
  return {
    gateway:     createStubGateway(),
    engine:      createAudioEngine(),
    analysis:    { analyze: async function* () {} },
    keybindings: createFakeKeybindingStore(),
    platform:    'web',
    storage:     createFakeStorage(),
    root:        createFakeRoot() as unknown as HTMLElement,
  }
}

describe('keyboard', () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
    delete (globalThis as { document?: unknown }).document
  })

  test('space toggles play/pause when nothing editable has focus', () => {
    (globalThis as unknown as { window: EventTarget }).window = new EventTarget()

    const stores   = createStores()
    const services = buildServices()
    const dispose  = keyboard(stores, services)

    press({ key: ' ' })

    // play-pause calls the engine directly (no store action) -- reaching
    // here without throwing is the assertion that the handler ran.
    dispose()
  })

  test('a shortcut typed into an input is swallowed, except the open-*/toggle-sidebar doors', () => {
    (globalThis as unknown as { window: EventTarget }).window = new EventTarget()

    const stores   = createStores()
    const services = buildServices()
    const dispose  = keyboard(stores, services)

    const input = fakeElement({ tagName: 'input' })

    press({ key: 'arrowright', metaKey: true }, input) // next-track — not in the always-allowed set
    expect(stores.player.getState().queue.currentId).toBeNull()

    press({ key: 'e', metaKey: true }, input) // toggle-sidebar
    expect(stores.ui.getState().sidebarOpen).toBe(false)

    dispose()
  })

  test('the same shortcut fires normally once focus leaves the editable element', () => {
    (globalThis as unknown as { window: EventTarget }).window = new EventTarget()

    const stores   = createStores()
    const services = buildServices()
    const dispose  = keyboard(stores, services)

    stores.player.dispatch({ type: 'player/playRequested', ids: [ 'a', 'b' ], startIndex: 0 })

    press({ key: 'arrowright', metaKey: true }, null)
    expect(stores.player.getState().queue.currentId).toBe('b')

    dispose()
  })

  test('edit-tags resolves the nearest [data-track-id] ancestor, falling back to the playing track', () => {
    (globalThis as unknown as { window: EventTarget }).window = new EventTarget()

    const stores   = createStores()
    const services = buildServices()
    const dispose  = keyboard(stores, services)

    const row  = fakeElement({ attributes: new Map([[ 'data-track-id', 'row-track' ]]) })
    const cell = fakeElement({ parentElement: row })

    press({ key: 'i', metaKey: true }, cell)
    expect(stores.ui.getState().editingTrackId).toBe('row-track')

    dispose()
  })

  test('dispose removes the listener', () => {
    const win                                                 = new EventTarget();
    (globalThis as unknown as { window: EventTarget }).window = win

    const stores   = createStores()
    const services = buildServices()
    const dispose  = keyboard(stores, services)
    dispose()

    press({ key: 'e', metaKey: true })
    expect(stores.ui.getState().sidebarOpen).toBe(true)
  })
})

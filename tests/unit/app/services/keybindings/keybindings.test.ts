/**
 * Converted from `desktop-audio/tests/keybindings/keybindings.test.ts`
 * (vitest -> bun:test): `vi.fn()` -> a small manual spy, since `bun:test`'s
 * `mock()` is otherwise a drop-in for `vi.fn()`.
 */
import { describe, expect, mock, test } from 'bun:test'
import {
  actionForEvent,
  createKeybindingStore,
  DEFAULT_KEYBINDINGS,
  formatShortcut,
  shortcutFromEvent,
} from '../../../../../src/app/services/keybindings'
import type { KeyEventLike } from '../../../../../src/app/services/keybindings'


function keyboard (key: string, modifiers: Partial<KeyEventLike> = {}): KeyEventLike {
  return {
    key,
    altKey:   false,
    ctrlKey:  false,
    metaKey:  false,
    shiftKey: false,
    ...modifiers,
  }
}

describe('keybindings service', () => {
  test('normalizes platform modifiers and resolves overlapping letter bindings', () => {
    expect(shortcutFromEvent(keyboard('ArrowRight', { metaKey: true }))).toBe('mod+arrowright')
    expect(shortcutFromEvent(keyboard('ArrowRight', { ctrlKey: true }))).toBe('mod+arrowright')
    expect(actionForEvent(DEFAULT_KEYBINDINGS, keyboard('p'))).toBe('previous-track')
    expect(actionForEvent(DEFAULT_KEYBINDINGS, keyboard('p', { metaKey: true }))).toBe('open-player')
  })

  test('persists customization, rejects conflicts, and resets atomically', () => {
    const write = mock(() => {})
    const store = createKeybindingStore({ read: () =>
      null,
    write })
    const listener = mock(() => {})
    store.subscribe(listener)

    expect(store.updateBinding('next-track-letter', 'x')).toBe(true)
    expect(store.getSnapshot().find(binding =>
      binding.id === 'next-track-letter')?.shortcut).toBe('x')
    expect(store.updateBinding('previous-track-letter', 'x')).toBe(false)
    expect(write).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledTimes(1)

    store.reset()
    expect(store.getSnapshot()).toEqual(DEFAULT_KEYBINDINGS)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  test('hydrates only known slots and formats shortcuts for each platform', () => {
    const saved = JSON.stringify([
      { id: 'open-settings', shortcut: 'alt+s' },
      { id: 'removed-action', shortcut: 'q' },
    ])
    const store = createKeybindingStore({ read: () =>
      saved,
    write: mock(() => {}) })

    expect(store.getSnapshot().find(binding =>
      binding.id === 'open-settings')?.shortcut).toBe('alt+s')
    expect(store.getSnapshot()).toHaveLength(DEFAULT_KEYBINDINGS.length)
    expect(formatShortcut('mod+arrowleft', true)).toBe('Cmd + Left')
    expect(formatShortcut('mod+arrowleft', false)).toBe('Ctrl + Left')
    expect(formatShortcut('')).toBe('Unassigned')
  })
})

import type { Keybinding, KeybindingAction, KeyEventLike } from './types'


const MODIFIER_KEYS = new Set([ 'alt', 'altgraph', 'control', 'meta', 'shift' ])

const DISPLAY_KEYS: Readonly<Record<string, string>> = {
  arrowdown:  'Down',
  arrowleft:  'Left',
  arrowright: 'Right',
  arrowup:    'Up',
  backspace:  'Backspace',
  delete:     'Delete',
  enter:      'Enter',
  escape:     'Escape',
  space:      'Space',
  tab:        'Tab',
}

/** Canonical, platform-neutral shortcut such as mod+arrowright. */
export function shortcutFromEvent (event: KeyEventLike): string | null {
  const rawKey = event.key.toLowerCase()
  if (MODIFIER_KEYS.has(rawKey))
    return null

  const key             = rawKey === ' ' ? 'space' : rawKey
  const parts: string[] = []
  if (event.metaKey || event.ctrlKey)
    parts.push('mod')
  if (event.altKey)
    parts.push('alt')
  if (event.shiftKey)
    parts.push('shift')
  parts.push(key)
  return parts.join('+')
}

/** Resolves one keyboard event against the current user-configured bindings. */
export function actionForEvent (
  bindings: readonly Keybinding[],
  event: KeyEventLike
): KeybindingAction | null {
  const shortcut = shortcutFromEvent(event)
  if (!shortcut)
    return null
  return bindings.find(binding =>
    binding.shortcut === shortcut)?.action ?? null
}

export function formatShortcut (shortcut: string, mac = false): string {
  if (!shortcut)
    return 'Unassigned'

  return shortcut.split('+')
    .map(part => {
      if (part === 'mod')
        return mac ? 'Cmd' : 'Ctrl'
      if (part === 'alt')
        return mac ? 'Option' : 'Alt'
      if (part === 'shift')
        return 'Shift'
      return DISPLAY_KEYS[part] ?? (part.length === 1 ? part.toUpperCase() : part)
    })
    .join(' + ')
}

import { DEFAULT_KEYBINDINGS } from './defaults'
import type { Keybinding, KeybindingStorage } from './types'


export interface KeybindingStore {
  readonly getSnapshot:   () => readonly Keybinding[]
  readonly subscribe:     (listener: () => void) => () => void
  readonly updateBinding: (id: string, shortcut: string) => boolean
  readonly reset:         () => void
}

function hydrate (
  defaults: readonly Keybinding[],
  storage?: KeybindingStorage
): readonly Keybinding[] {
  try {
    const raw = storage?.read()
    if (!raw)
      return [ ...defaults ]

    const saved = JSON.parse(raw) as { id?: unknown; shortcut?: unknown }[]
    if (!Array.isArray(saved))
      return [ ...defaults ]

    const shortcuts = new Map(
      saved
        .filter(entry =>
          typeof entry.id === 'string' && typeof entry.shortcut === 'string')
        .map(entry =>
          [ entry.id as string, entry.shortcut as string ])
    )
    const used = new Set<string>()

    return defaults.map(binding => {
      const savedShortcut = shortcuts.get(binding.id)
      if (savedShortcut === undefined || savedShortcut && used.has(savedShortcut)) {
        used.add(binding.shortcut)
        return binding
      }
      if (savedShortcut)
        used.add(savedShortcut)
      return { ...binding, shortcut: savedShortcut }
    })
  }
  catch {
    return [ ...defaults ]
  }
}

export function createKeybindingStore (
  storage?: KeybindingStorage,
  defaults: readonly Keybinding[] = DEFAULT_KEYBINDINGS
): KeybindingStore {
  let bindings = hydrate(defaults, storage)
  const listeners = new Set<() => void>()

  const persist = () => {
    try {
      storage?.write(JSON.stringify(bindings.map(({ id, shortcut }) =>
        ({ id, shortcut }))))
    }
    catch {
      // A read-only or full storage backend must not disable keyboard control.
    }
  }

  const publish = () => {
    for (const listener of listeners)
      listener()
  }

  return {
    getSnapshot: () =>
      bindings,

    subscribe: listener => {
      listeners.add(listener)
      return () =>
        listeners.delete(listener)
    },

    updateBinding: (id, shortcut) => {
      if (shortcut && bindings.some(binding =>
        binding.id !== id && binding.shortcut === shortcut))
        return false

      const current = bindings.find(binding =>
        binding.id === id)
      if (!current)
        return false
      if (current.shortcut === shortcut)
        return true

      bindings = bindings.map(binding =>
        binding.id === id ? { ...binding, shortcut } : binding)
      persist()
      publish()
      return true
    },

    reset: () => {
      bindings = [ ...defaults ]
      persist()
      publish()
    },
  }
}

export function localStorageAdapter (key: string): KeybindingStorage {
  return {
    read: () => {
      try {
        return typeof localStorage === 'undefined' ? null : localStorage.getItem(key)
      }
      catch {
        return null
      }
    },
    write: value => {
      if (typeof localStorage !== 'undefined')
        localStorage.setItem(key, value)
    },
  }
}

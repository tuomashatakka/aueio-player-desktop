export { DEFAULT_KEYBINDINGS } from './defaults'

export { actionForEvent, formatShortcut, shortcutFromEvent } from './keyboard'

export { createKeybindingStore, localStorageAdapter } from './store'

export type { KeybindingStore } from './store'

export type {
  Keybinding,
  KeybindingAction,
  KeybindingStorage,
  KeyEventLike,
} from './types'

import { createKeybindingStore, localStorageAdapter } from './store'


const STORAGE_KEY = 'aueio-keybindings'

/** Shared app instance; the package itself can also create isolated stores. */
export const keybindingStore = createKeybindingStore(localStorageAdapter(STORAGE_KEY))

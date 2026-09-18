export type KeybindingAction =
  | 'next-track' |
  'previous-track' |
  'edit-tags' |
  'open-library' |
  'open-player' |
  'open-settings' |
  'play-pause' |
  'toggle-sidebar' |
  'volume-down' |
  'volume-up'

export interface Keybinding {
  readonly id:       string
  readonly action:   KeybindingAction
  readonly label:    string
  readonly shortcut: string
}

export interface KeyEventLike {
  readonly altKey:   boolean
  readonly ctrlKey:  boolean
  readonly key:      string
  readonly metaKey:  boolean
  readonly shiftKey: boolean
}

export interface KeybindingStorage {
  readonly read:  () => string | null
  readonly write: (value: string) => void
}

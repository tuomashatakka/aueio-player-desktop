/**
 * A static copy of the 12 default keybindings, for the Settings → Hotkeys
 * table. `services/keybindings/defaults.ts` is the live source of truth the
 * effect layer reads to resolve key presses; `ui/` cannot import `services/`
 * (lint-enforced), so this mirrors its shape and values for display only.
 */

export interface HotkeyRow {
  readonly id:       string
  readonly label:    string
  readonly shortcut: string
}

export const DEFAULT_HOTKEYS: readonly HotkeyRow[] = [
  { id: 'play-pause', label: 'Play or pause', shortcut: 'space' },
  { id: 'next-track-letter', label: 'Next track (letter)', shortcut: 'n' },
  { id: 'next-track-system', label: 'Next track (system)', shortcut: 'mod+arrowright' },
  { id: 'previous-track-letter', label: 'Previous track (letter)', shortcut: 'p' },
  { id: 'previous-track-system', label: 'Previous track (system)', shortcut: 'mod+arrowleft' },
  { id: 'open-settings', label: 'Open settings', shortcut: 'mod+,' },
  { id: 'edit-tags', label: 'Edit tags', shortcut: 'mod+i' },
  { id: 'open-library', label: 'Open library', shortcut: 'mod+l' },
  { id: 'open-player', label: 'Open now playing', shortcut: 'mod+p' },
  { id: 'toggle-sidebar', label: 'Toggle side menu', shortcut: 'mod+e' },
  { id: 'volume-up', label: 'Volume up', shortcut: 'mod+arrowup' },
  { id: 'volume-down', label: 'Volume down', shortcut: 'mod+arrowdown' },
]

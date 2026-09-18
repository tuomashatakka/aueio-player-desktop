import type { Keybinding } from './types'


export const DEFAULT_KEYBINDINGS: readonly Keybinding[] = [
  { id: 'play-pause', action: 'play-pause', label: 'Play or pause', shortcut: 'space' },
  { id: 'next-track-letter', action: 'next-track', label: 'Next track (letter)', shortcut: 'n' },
  { id: 'next-track-system', action: 'next-track', label: 'Next track (system)', shortcut: 'mod+arrowright' },
  { id: 'previous-track-letter', action: 'previous-track', label: 'Previous track (letter)', shortcut: 'p' },
  { id: 'previous-track-system', action: 'previous-track', label: 'Previous track (system)', shortcut: 'mod+arrowleft' },
  { id: 'open-settings', action: 'open-settings', label: 'Open settings', shortcut: 'mod+,' },
  { id: 'edit-tags', action: 'edit-tags', label: 'Edit tags', shortcut: 'mod+i' },
  { id: 'open-library', action: 'open-library', label: 'Open library', shortcut: 'mod+l' },
  { id: 'open-player', action: 'open-player', label: 'Open now playing', shortcut: 'mod+p' },
  { id: 'toggle-sidebar', action: 'toggle-sidebar', label: 'Toggle side menu', shortcut: 'mod+e' },
  { id: 'volume-up', action: 'volume-up', label: 'Volume up', shortcut: 'mod+arrowup' },
  { id: 'volume-down', action: 'volume-down', label: 'Volume down', shortcut: 'mod+arrowdown' },
]

# Keybindings

Keyboard control is data, not a switch statement: every shortcut is a
`Keybinding` record (`id`, `action`, `label`, `shortcut`) defined in
`src/app/services/keybindings/defaults.ts` and resolved against `keydown`
events by `src/app/services/keybindings/keyboard.ts`. The `keyboard` effect
(`src/app/effects/keyboard.ts`) is the only place a key event turns into a
dispatched action; components never read `keydown` themselves.

## Defaults

| Action | Label | Shortcut |
|---|---|---|
| `play-pause` | Play or pause | `space` |
| `next-track` | Next track (letter) | `n` |
| `next-track` | Next track (system) | `mod+arrowright` |
| `previous-track` | Previous track (letter) | `p` |
| `previous-track` | Previous track (system) | `mod+arrowleft` |
| `open-settings` | Open settings | `mod+,` |
| `edit-tags` | Edit tags | `mod+i` |
| `open-library` | Open library | `mod+l` |
| `open-player` | Open now playing | `mod+p` |
| `toggle-sidebar` | Toggle side menu | `mod+e` |
| `volume-up` | Volume up | `mod+arrowup` |
| `volume-down` | Volume down | `mod+arrowdown` |

`mod` resolves to `Cmd` on macOS and `Ctrl` elsewhere. Two actions
(`next-track`, `previous-track`) each carry two bindings — a bare letter and
a system-style modifier chord — so both land in the same conflict-detection
pool under different `id`s.

`edit-tags` (`mod+i`) is the one keyboard door into the tag editor: it
resolves the target from `[data-track-id]` under focus, falling back to the
currently playing track, and needs no IPC round trip — see the tag-editor
notes in `AGENTS.md`/the migration plan for the other two doors (row and
card context menus).

## Editing bindings

Settings → Hotkeys lists every binding with an editable `<kbd>` field.
Typing a new chord calls `KeybindingStore.updateBinding(id, shortcut)`
(`src/app/services/keybindings/store.ts`):

- An empty shortcut clears that binding (it becomes unreachable by keyboard,
  reachable only through its other doors, if any).
- A shortcut already used by a *different* binding is rejected — the store
  returns `false` and the field's value is left unchanged; there's a
  conflict-detection check in this same call, not a separate pass.
- Assigning a binding's current shortcut back to itself is a no-op success.

`reset()` restores every binding to `DEFAULT_KEYBINDINGS`.

## Storage

Bindings persist to `localStorage` under the key **`aueio-keybindings`**,
written by `localStorageAdapter` (`src/app/services/keybindings/store.ts`) as
a JSON array of `{id, shortcut}` pairs — labels and actions are not
persisted, so renaming a label or changing what an action does never needs a
migration. On load, `hydrate()` merges saved shortcuts onto
`DEFAULT_KEYBINDINGS` by `id`: a saved shortcut that collides with another
binding's default, or with an already-claimed shortcut earlier in the list,
is dropped and that binding keeps its default instead of producing two
bindings sharing one chord. Corrupt or missing storage falls back to the
defaults silently (wrapped in `try/catch`).

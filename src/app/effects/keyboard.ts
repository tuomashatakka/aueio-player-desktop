/**
 * `window` `keydown` → `actionForEvent` → dispatch. Gated so a shortcut
 * typed into a search box or a tag-editor field does not also drive the
 * transport — except the `open-*`/`toggle-sidebar` doors, which have to work
 * from anywhere. See AGENTS.md L6 and `services/keybindings`.
 */
import { actionForEvent } from '../services/keybindings'
import type { KeybindingAction, KeyEventLike } from '../services/keybindings'
import type { Effect } from './services'


const EDITABLE_TAGS  = new Set([ 'input', 'textarea', 'select' ])
const ALWAYS_ALLOWED = new Set<KeybindingAction>([ 'open-library', 'open-player', 'open-settings', 'toggle-sidebar' ])
const VOLUME_STEP    = 0.05

interface ElementLike {
  readonly tagName?:           string
  readonly isContentEditable?: boolean
  readonly parentElement?:     ElementLike | null
  getAttribute? (name: string): string | null
}

function isEditable (element: ElementLike | null): boolean {
  if (!element)
    return false
  if (element.isContentEditable)
    return true

  const tag = element.tagName?.toLowerCase()
  return tag !== undefined && EDITABLE_TAGS.has(tag)
}

/** Walks `element`'s ancestry for `[data-track-id]` — a hand-rolled `.closest()` so a plain fake element is enough to test it. */
function trackIdFrom (element: ElementLike | null): string | null {
  let node = element
  while (node) {
    const id = node.getAttribute?.('data-track-id')
    if (id)
      return id
    node = node.parentElement ?? null
  }
  return null
}

function activeElement (): ElementLike | null {
  return typeof document === 'undefined' ? null : (document.activeElement as unknown as ElementLike | null)
}

export const keyboard: Effect = (stores, services) => {
  if (typeof window === 'undefined')
    return (): void => {}

  function handleKeydown (event: KeyEventLike): void {
    const action = actionForEvent(services.keybindings.getSnapshot(), event)
    if (!action)
      return

    const target = activeElement()
    if (isEditable(target) && !ALWAYS_ALLOWED.has(action))
      return

    switch (action) {
      case 'play-pause': {
        const status = stores.player.getState().playback.status
        if (status === 'playing')
          services.engine.pause()
        else
          void services.engine.play()
        break
      }
      case 'next-track':
        stores.player.dispatch({ type: 'player/advance', direction: 1 })
        break
      case 'previous-track':
        stores.player.dispatch({ type: 'player/advance', direction: -1 })
        break
      case 'open-library':
        stores.ui.dispatch({ type: 'ui/viewChanged', view: 'library' })
        break
      case 'open-player':
        stores.ui.dispatch({ type: 'ui/overlayOpened', overlay: 'player' })
        break
      case 'open-settings':
        stores.ui.dispatch({ type: 'ui/viewChanged', view: 'settings' })
        break
      case 'toggle-sidebar':
        stores.ui.dispatch({ type: 'ui/sidebarToggled' })
        break
      case 'volume-up': {
        const volume = stores.player.getState().playback.volume
        stores.player.dispatch({ type: 'player/volumeChanged', volume: volume + VOLUME_STEP })
        break
      }
      case 'volume-down': {
        const volume = stores.player.getState().playback.volume
        stores.player.dispatch({ type: 'player/volumeChanged', volume: volume - VOLUME_STEP })
        break
      }
      case 'edit-tags': {
        const id = trackIdFrom(target) ?? stores.player.getState().playback.trackId
        if (id)
          stores.ui.dispatch({ type: 'ui/tagEditorOpened', id })
        break
      }
      default:
        break
    }
  }

  const listener = handleKeydown as unknown as EventListener
  window.addEventListener('keydown', listener)
  return (): void => {
    window.removeEventListener('keydown', listener)
  }
}

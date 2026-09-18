/**
 * The app shell: `.shell` (titlebar, sidebar, the active main view, the
 * footer player) plus every overlay as a sibling of it — the expanded player,
 * the tag editor dialog, the DSP panel and the context menu — mirroring
 * `index.html`'s top-level structure exactly (`dialog.settings` is not
 * reproduced: Settings is a main view, not a modal). See AGENTS.md L8.
 */
import type { ReactElement } from 'react'
import { useEffect, useRef } from 'react'
import { ContextMenu } from '../components/ContextMenu'
import { Player } from '../components/Player'
import { Dsp } from '../views/Dsp'
import { Library } from '../views/Library'
import { SettingsView } from '../views/Settings'
import { TagEditor } from '../views/TagEditor'
import { useStore, useStores } from '../hooks/useStore'
import { Sidebar } from './Sidebar'
import { Titlebar } from './Titlebar'


/** Opens or closes a `popover="manual"` element to match `open`, ignoring a call that would be a no-op. */
function syncPopover (element: HTMLElement | null, open: boolean): void {
  if (!element)
    return

  try {
    const isOpen = element.matches(':popover-open')
    if (open && !isOpen)
      element.showPopover()
    else if (!open && isOpen)
      element.hidePopover()
  }
  catch {
    // Popover API unavailable (older WebKitGTK) — the element stays put.
  }
}

/** Opens or closes a modal `<dialog>` to match `open`. */
function syncDialog (dialog: HTMLDialogElement | null, open: boolean): void {
  if (!dialog)
    return

  if (open && !dialog.open)
    dialog.showModal()
  else if (!open && dialog.open)
    dialog.close()
}

export function Shell (): ReactElement {
  const stores = useStores()

  const view         = useStore(stores.ui, state =>
    state.view)
  const overlay      = useStore(stores.ui, state =>
    state.overlay)
  const contextMenu  = useStore(stores.ui, state =>
    state.contextMenu)

  const playerOverlayRef = useRef<HTMLElement>(null)
  const dspRef           = useRef<HTMLElement>(null)
  const tagEditorRef     = useRef<HTMLDialogElement>(null)
  const contextMenuRef   = useRef<HTMLElement>(null)

  // eslint-disable-next-line react-strict/prefer-no-use-effect -- mirrors `ui.overlay`/`contextMenu` onto the imperative popover/`<dialog>` DOM APIs (open state, and the context menu's `--menu-x`/`--menu-y` position), none of which has a declarative React equivalent
  useEffect(() => {
    syncPopover(playerOverlayRef.current, overlay === 'player')
    syncPopover(dspRef.current, overlay === 'dsp')
    syncPopover(contextMenuRef.current, contextMenu !== null)
    syncDialog(tagEditorRef.current, overlay === 'tag-editor')

    const menu = contextMenuRef.current
    if (menu && contextMenu) {
      menu.style.setProperty('--menu-x', `${contextMenu.x}px`)
      menu.style.setProperty('--menu-y', `${contextMenu.y}px`)
    }
  })

  return <>
    <div className="shell">
      <Titlebar />
      <Sidebar />

      <main data-view={ view }>
        {view === 'library' ? <Library /> : <SettingsView />}
      </main>

      <footer className="player">
        <Player expanded={ false } />
      </footer>
    </div>

    <section ref={ playerOverlayRef } className="player" data-expanded popover="manual">
      <Player expanded />
    </section>

    <dialog ref={ tagEditorRef } className="tag-editor">
      <TagEditor />
    </dialog>

    <section ref={ dspRef } className="dsp" popover="manual">
      <Dsp />
    </section>

    <menu ref={ contextMenuRef } className="context" data-x={ contextMenu?.x } data-y={ contextMenu?.y } popover="">
      <ContextMenu />
    </menu>
  </>
}

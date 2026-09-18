/**
 * The Linux `<menu popover>` fallback's items — the native menu round trip
 * has no component of its own (see AGENTS.md L8). Positioning and the
 * popover's open/closed state are owned by `Shell`, which holds the ref to
 * the `<menu class="context">` element this renders into.
 */
import type { ReactElement } from 'react'
import type { MenuItemJSON } from '../../../shared/dto'
import { useStore, useStores } from '../hooks/useStore'


/** Referentially stable fallback so the selector below never hands `useSyncExternalStore` a fresh `[]` each call. */
const NO_ITEMS: readonly MenuItemJSON[] = []

export function ContextMenu (): ReactElement {
  const stores = useStores()
  const items  = useStore(stores.ui, state =>
    state.contextMenu?.items ?? NO_ITEMS)

  function act (actionId: string): void {
    stores.ui.dispatch({ type: 'ui/contextMenuActioned', actionId })
  }

  return <>
    {items.map((item, index) =>
      'separator' in item
        ? <hr key={ index } />
        : <ContextMenuButton key={ item.id } id={ item.id } label={ item.label } danger={ item.danger ?? false } onAct={ act } />)}
  </>
}

interface ContextMenuButtonProps {
  readonly id:     string
  readonly label:  string
  readonly danger: boolean
  readonly onAct:  (actionId: string) => void
}

function ContextMenuButton ({ id, label, danger, onAct }: ContextMenuButtonProps): ReactElement {
  function onClick (): void {
    onAct(id)
  }

  return <button className={ danger ? 'danger' : undefined } onClick={ onClick }>{label}</button>
}

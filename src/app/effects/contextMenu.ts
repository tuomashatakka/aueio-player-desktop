/**
 * Bridges `ui/`'s native-menu and window-chrome requests to the gateway.
 * `ui/contextMenuRequested` only opens the native popover round trip on
 * macos/windows — linux/web render their own in-renderer popover and never
 * ask main for one (see AGENTS.md's Context Menus section). The two other
 * `ui/*Requested` actions here (`windowCommandRequested`, `rootPickRequested`)
 * are plain, platform-independent gateway calls the effect layer answers the
 * same way everywhere.
 */
import type { Effect } from './services'
import { tapDispatch } from './tapDispatch'


export const contextMenu: Effect = (stores, services) => {
  const nativeMenus = services.platform === 'macos' || services.platform === 'windows'

  const offMenuAction = services.gateway.on('menu.action', payload => {
    if (payload.actionId !== null)
      stores.ui.dispatch({ type: 'ui/contextMenuActioned', actionId: payload.actionId })
    stores.ui.dispatch({ type: 'ui/contextMenuClosed' })
  })

  const untapUi = tapDispatch(stores.ui, action => {
    switch (action.type) {
      case 'ui/contextMenuRequested':
        if (nativeMenus)
          void services.gateway.showContextMenu(action.menuId, action.items)
        break
      case 'ui/windowCommandRequested':
        void services.gateway.windowCommand(action.command)
        break
      case 'ui/rootPickRequested':
        services.gateway.pickRoot().then(root => {
          if (!root)
            return

          const roots = stores.settings.getState().settings.roots
          if (roots.includes(root))
            return

          stores.settings.dispatch({ type: 'settings/changed', patch: { roots: [ ...roots, root ]}})
        })
        break
      default:
        break
    }
  })

  return () => {
    offMenuAction()
    untapUi()
  }
}

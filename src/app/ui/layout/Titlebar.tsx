/**
 * The window's title bar: sidebar toggle, the library search field, and the
 * window control buttons. Everything outside `<search>`/`<nav>` is a drag
 * region — see the `electrobun-webkit-app-region-*` classes in AGENTS.md L8.
 */
import type { ChangeEvent, ReactElement } from 'react'
import { Icon } from '../components/Icon'
import { useStore, useStores } from '../hooks/useStore'


export function Titlebar (): ReactElement {
  const stores = useStores()

  const sidebarOpen = useStore(stores.ui, state =>
    state.sidebarOpen)
  const search = useStore(stores.library, state =>
    state.search)

  function toggleSidebar (): void {
    stores.ui.dispatch({ type: 'ui/sidebarToggled' })
  }

  function onSearchChange (event: ChangeEvent<HTMLInputElement>): void {
    stores.library.dispatch({ type: 'library/searchChanged', search: event.target.value })
  }

  function minimize (): void {
    stores.ui.dispatch({ type: 'ui/windowCommandRequested', command: 'minimize' })
  }

  function maximize (): void {
    stores.ui.dispatch({ type: 'ui/windowCommandRequested', command: 'maximize' })
  }

  function close (): void {
    stores.ui.dispatch({ type: 'ui/windowCommandRequested', command: 'close' })
  }

  return <header className="titlebar electrobun-webkit-app-region-drag">
    <button
      className="button icon electrobun-webkit-app-region-no-drag"
      aria-label="Toggle sidebar"
      aria-controls="sidebar"
      aria-expanded={ sidebarOpen }
      onClick={ toggleSidebar }>
      <Icon name="menu" />
    </button>

    <h1>aüeio</h1>

    <search className="electrobun-webkit-app-region-no-drag">
      <input
        type="search"
        name="q"
        value={ search }
        placeholder="Search library…"
        onChange={ onSearchChange } />
    </search>

    <nav className="electrobun-webkit-app-region-no-drag" aria-label="Window">
      <button className="button icon" aria-label="Minimize" onClick={ minimize }>
        <Icon name="minimize" />
      </button>

      <button className="button icon" aria-label="Maximize" onClick={ maximize }>
        <Icon name="maximize" />
      </button>

      <button className="button icon" aria-label="Close window" onClick={ close }>
        <Icon name="close" />
      </button>
    </nav>
  </header>
}

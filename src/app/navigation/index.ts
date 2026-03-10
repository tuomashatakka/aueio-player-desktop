import type { ViewName } from '../state/types'
import type { Store } from '../state/index'
import { ActionType } from '../state/actions'


export type NavigationState = {
  readonly view: ViewName
  readonly nowPlayingExpanded?: boolean
}

/**
 * Push a view change entry to the browser history.
 * Optionally replaces the current entry (use for the initial load).
 */
export const navigate = (view: ViewName, replace = false): void => {
  const ns: NavigationState = { view }

  if (replace)
    history.replaceState(ns, '', `#${view}`)
  else
    history.pushState(ns, '', `#${view}`)
}

/** Push a now-playing state to history (expanded/collapsed). */
export const navigateNowPlaying = (expanded: boolean): void => {
  const ns: NavigationState = { view: 'library', nowPlayingExpanded: expanded }
  history.pushState(ns, '', `#nowplaying`)
}

/** Read the initial view from the URL hash on page load. */
export const getCurrentViewFromURL = (): ViewName => {
  const hash = location.hash.slice(1)
  return hash === 'settings' ? 'settings' : 'library'
}

/**
 * Bind the browser's popstate event to dispatch view-change actions.
 * Returns a cleanup function.
 */
export const bindPopState = (dispatch: Store['dispatch']): () => void => {
  const handler = (e: PopStateEvent) => {
    const ns = e.state as NavigationState | null

    if (!ns)
      return

    dispatch({ type: ActionType.VIEW_CHANGED, payload: ns.view })

    if (ns.nowPlayingExpanded !== undefined) {
      dispatch(
        ns.nowPlayingExpanded
          ? { type: ActionType.NOW_PLAYING_EXPANDED }
          : { type: ActionType.NOW_PLAYING_COLLAPSED }
      )
    }
  }

  window.addEventListener('popstate', handler)
  return () => { window.removeEventListener('popstate', handler) }
}

/**
 * The library header's location trail. The `Library` crumb is always first
 * and dispatches `ui/folderSelected('')` — the empty path is this app's
 * "back to the roots" convention, since there is no dedicated clear-scope
 * action. `Library.tsx` (the view) shares the same convention when scoping
 * the track list to `scope.folder`.
 */
import type { ReactElement } from 'react'
import type { Playlist } from '../../domain'
import type { UiScope } from '../../state/ui'
import { useStore, useStores } from '../hooks/useStore'


const PATH_SEPARATOR = /[/\\]/

interface Crumb {
  readonly key:   string
  readonly label: string
  readonly path:  string | null
}

function folderCrumbs (folder: string): readonly Crumb[] {
  const segments = folder.split(PATH_SEPARATOR).filter(Boolean)

  let running = ''
  return segments.map(segment => {
    running = running.length === 0 ? segment : `${running}/${segment}`
    return { key: running, label: segment, path: running }
  })
}

function crumbsFor (scope: UiScope, playlists: ReadonlyMap<string, Playlist>): readonly Crumb[] {
  const root: Crumb = { key: 'library', label: 'Library', path: '' }

  if (scope.playlist !== null) {
    const playlist = playlists.get(scope.playlist)
    return [ root, { key: 'playlist', label: playlist?.name ?? 'Playlist', path: null }]
  }

  if (scope.list !== null)
    return [ root, { key: 'list', label: scope.list === 'queue' ? 'Now Playing' : 'Up Next', path: null }]

  if (scope.group !== null)
    return [ root, { key: 'group', label: scope.group.label, path: null }]

  if (scope.folder !== null && scope.folder.length > 0)
    return [ root, ...folderCrumbs(scope.folder) ]

  return [ root ]
}

export function Breadcrumbs (): ReactElement {
  const stores = useStores()
  const scope  = useStore(stores.ui, state =>
    state.scope)
  const playlists = useStore(stores.library, state =>
    state.playlists)

  const crumbs = crumbsFor(scope, playlists)

  return <nav className="breadcrumbs" aria-label="Location">
    <ol>
      {crumbs.map(crumb =>
        <BreadcrumbItem key={ crumb.key } label={ crumb.label } path={ crumb.path } />)}
    </ol>
  </nav>
}

interface BreadcrumbItemProps {
  readonly label: string
  readonly path:  string | null
}

function BreadcrumbItem ({ label, path }: BreadcrumbItemProps): ReactElement {
  const stores = useStores()

  function onClick (): void {
    if (path !== null)
      stores.ui.dispatch({ type: 'ui/folderSelected', path })
  }

  return <li>
    <button onClick={ onClick }>{label}</button>
  </li>
}

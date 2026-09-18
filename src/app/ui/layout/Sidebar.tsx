/**
 * The `<aside id="sidebar">`: Playback shortcuts, the folder tree and
 * playlists, each in their own `<details name="sidebar">` (native accordion —
 * `name` makes the three mutually exclusive), plus footer buttons for the
 * DSP and Settings overlays. See AGENTS.md L8.
 */
import type { KeyboardEvent, ReactElement } from 'react'
import { useRef, useState } from 'react'
import { selectFolderTree } from '../../state/library'
import { useStore, useStores } from '../hooks/useStore'
import type { FolderTreeController } from './FolderTree'
import { FolderTree, flattenFolders } from './FolderTree'


export function Sidebar (): ReactElement {
  const stores = useStores()

  const view      = useStore(stores.ui, state =>
    state.view)
  const scope     = useStore(stores.ui, state =>
    state.scope)
  const tree      = useStore(stores.library, selectFolderTree)
  const playlists = useStore(stores.library, state =>
    state.playlists)

  const itemRefs                        = useRef(new Map<string, HTMLLIElement>())
  const [ focusedPath, setFocusedPath ] = useState<string | null>(null)

  const flat       = flattenFolders(tree)
  const activePath = focusedPath ?? flat[0]?.path ?? null

  function registerRef (path: string, element: HTMLLIElement | null): void {
    if (element)
      itemRefs.current.set(path, element)
    else
      itemRefs.current.delete(path)
  }

  function focusItem (path: string): void {
    setFocusedPath(path)
    itemRefs.current.get(path)?.focus()
  }

  function selectFolder (path: string): void {
    setFocusedPath(path)
    stores.ui.dispatch({ type: 'ui/folderSelected', path })
  }

  function onTreeKeyDown (event: KeyboardEvent<HTMLLIElement>): void {
    const currentPath = event.currentTarget.dataset.path
    if (currentPath === undefined)
      return

    const index = flat.findIndex(item =>
      item.path === currentPath)
    if (index === -1)
      return

    if (event.key === 'ArrowDown') {
      event.preventDefault()

      const next = flat[Math.min(index + 1, flat.length - 1)]
      if (next)
        focusItem(next.path)
    }
    else if (event.key === 'ArrowUp') {
      event.preventDefault()

      const previous = flat[Math.max(index - 1, 0)]
      if (previous)
        focusItem(previous.path)
    }
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectFolder(currentPath)
    }
  }

  const controller: FolderTreeController = {
    activePath,
    selectedPath: scope.folder,
    registerRef,
    onKeyDown:    onTreeKeyDown,
    onSelect:     selectFolder,
  }

  function selectList (list: 'queue' | 'history'): void {
    stores.ui.dispatch({ type: 'ui/listSelected', list })
  }

  function onNowPlayingClick (): void {
    selectList('queue')
  }

  function onUpNextClick (): void {
    selectList('history')
  }

  function openDsp (): void {
    stores.ui.dispatch({ type: 'ui/overlayOpened', overlay: 'dsp' })
  }

  function openSettings (): void {
    // `overlay` (DSP, the tag editor, the expanded player) is orthogonal to
    // `view` in the reducer, and a `popover="manual"` element has no
    // light-dismiss — so without this, an overlay left open (most often
    // DSP, opened just above) keeps intercepting pointer events over
    // whatever `<main>` swaps to underneath it.
    stores.ui.dispatch({ type: 'ui/overlayClosed' })
    stores.ui.dispatch({ type: 'ui/viewChanged', view: 'settings' })
  }

  // Settings replaces `<main>` outright (it's a view, not a modal — see
  // `Shell`'s docstring), and `Breadcrumbs`' "Library" crumb is part of
  // `Library` itself, so it unmounts along with everything else `<main>`
  // was showing. Without a nav item that survives the swap, Settings was a
  // dead end reachable only by the `mod+l` shortcut.
  function openLibrary (): void {
    stores.ui.dispatch({ type: 'ui/overlayClosed' })
    stores.ui.dispatch({ type: 'ui/viewChanged', view: 'library' })
  }

  return <aside id="sidebar" className="sidebar">
    <details name="sidebar" open>
      <summary>Playback</summary>

      <menu>
        <li>
          {/*
            `aria-label` (not a text change) so the visible "Now Playing"
            label is untouched but the accessible name no longer overlaps
            `Player`'s "Expand player" control — both otherwise match a
            loose "now playing" screenshot/test query aimed at the latter.
          */}
          <button aria-label="Playback queue" aria-pressed={ scope.list === 'queue' } onClick={ onNowPlayingClick }>Now Playing</button>
        </li>

        <li>
          <button aria-pressed={ scope.list === 'history' } onClick={ onUpNextClick }>Up Next</button>
        </li>
      </menu>
    </details>

    <details name="sidebar" open>
      <summary>Folders</summary>

      <ul role="tree">
        <FolderTree nodes={ tree } controller={ controller } />
      </ul>

    </details>

    <details name="sidebar">
      <summary>Playlists</summary>

      <ul>
        {Array.from(playlists.values()).map(playlist =>
          <PlaylistRow key={ playlist.id } id={ playlist.id } name={ playlist.name } selected={ scope.playlist === playlist.id } />)}
      </ul>
    </details>

    <footer>
      <menu>
        <li>
          <button className="button ghost" aria-pressed={ view === 'library' } onClick={ openLibrary }>Library</button>
        </li>

        <li>
          <button className="button ghost" onClick={ openDsp }>DSP</button>
        </li>

        <li>
          <button className="button ghost" aria-pressed={ view === 'settings' } onClick={ openSettings }>Settings</button>
        </li>
      </menu>
    </footer>
  </aside>
}

interface PlaylistRowProps {
  readonly id:       string
  readonly name:     string
  readonly selected: boolean
}

function PlaylistRow ({ id, name, selected }: PlaylistRowProps): ReactElement {
  const stores = useStores()

  function onClick (): void {
    stores.ui.dispatch({ type: 'ui/playlistSelected', id })
  }

  return <li>
    <button aria-pressed={ selected } onClick={ onClick }>{name}</button>
  </li>
}

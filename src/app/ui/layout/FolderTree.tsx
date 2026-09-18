/**
 * The sidebar's `role="tree"` folder list: one root per library root, with a
 * roving tabindex (WAI-ARIA treeitem pattern — one item tabbable, arrow keys
 * move focus, `Enter`/`Space` selects). All nodes render expanded; there is
 * no `ui` slice for per-folder collapse state, so the tree is always fully
 * open, matching the static `aria-expanded="true"` markup.
 */
import type { KeyboardEvent, ReactElement } from 'react'
import type { FolderNode } from '../../domain'


export interface FlatFolder {
  readonly path: string
  readonly name: string
}

/** Depth-first, pre-order flattening — the order the roving tabindex walks. */
export function flattenFolders (nodes: readonly FolderNode[]): readonly FlatFolder[] {
  const flat: FlatFolder[] = []

  for (const node of nodes) {
    flat.push({ path: node.path, name: node.name })
    flat.push(...flattenFolders(node.children))
  }

  return flat
}

export interface FolderTreeController {
  readonly activePath:   string | null
  readonly selectedPath: string | null
  readonly registerRef:  (path: string, element: HTMLLIElement | null) => void
  readonly onKeyDown:    (event: KeyboardEvent<HTMLLIElement>) => void
  readonly onSelect:     (path: string) => void
}

interface FolderTreeProps {
  readonly nodes:      readonly FolderNode[]
  readonly controller: FolderTreeController
}

/**
 * The `<li role="treeitem">` rows for `nodes`, with no wrapping `<ul>` — the
 * caller owns that (`role="tree"` at the sidebar root, `role="group"` for a
 * nested level), so this same list of rows serves both.
 */
export function FolderTree ({ nodes, controller }: FolderTreeProps): ReactElement {
  return <>
    {nodes.map(node =>
      <FolderTreeItem key={ node.path } node={ node } controller={ controller } />)}
  </>
}

interface FolderTreeItemProps {
  readonly node:       FolderNode
  readonly controller: FolderTreeController
}

function FolderTreeItem ({ node, controller }: FolderTreeItemProps): ReactElement {
  const { activePath, selectedPath, registerRef, onKeyDown, onSelect } = controller
  const hasChildren                                                    = node.children.length > 0
  const isActive                                                       = node.path === activePath
  const isSelected                                                     = node.path === selectedPath

  function ref (element: HTMLLIElement | null): void {
    registerRef(node.path, element)
  }

  function onClick (): void {
    onSelect(node.path)
  }

  return <li
    ref={ ref }
    role="treeitem"
    aria-expanded={ hasChildren ? true : undefined }
    aria-selected={ isSelected }
    data-path={ node.path }
    tabIndex={ isActive ? 0 : -1 }
    onClick={ onClick }
    onKeyDown={ onKeyDown }>
    {node.name}

    {hasChildren &&
        <ul role="group">
          <FolderTree nodes={ node.children } controller={ controller } />
        </ul>
    }
  </li>
}

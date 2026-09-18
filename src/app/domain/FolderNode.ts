/**
 * The sidebar's folder tree, and the rows the table shows for one location in
 * it. Ported from desktop-audio/src/app/hooks/useLibraryScanner.ts
 * (`buildFolderTree`) and desktop-audio/src/app/utils/folders.ts
 * (`findFolder`, `subfolderRows`).
 */
import { Track } from './Track'


const SEPARATOR = /[/\\]/

/** One immediate subfolder of the browsed location. */
export interface FolderRow {
  readonly path:       string
  readonly name:       string
  readonly trackCount: number
}

export class FolderNode {
  private constructor (
    readonly path: string,
    readonly name: string,
    readonly children: readonly FolderNode[],
  ) {
    Object.freeze(this)
  }

  static of (path: string, name: string, children: readonly FolderNode[] = []): FolderNode {
    return new FolderNode(path, name, Object.freeze(children.slice()))
  }
}

/** Builds one tree per root, from the flat list of file paths under it. */
export function buildFolderTree (roots: readonly string[], paths: readonly string[]): readonly FolderNode[] {
  const nodes: FolderNode[] = []

  for (const rootPath of roots) {
    const rootFiles   = paths.filter(f =>
      f.startsWith(rootPath))
    const childrenMap = new Map<string, string[]>()

    for (const file of rootFiles) {
      const relative = file.slice(rootPath.length).replace(/^[\\/]/, '')
      const parts    = relative.split(SEPARATOR)

      let current = rootPath
      for (let i = 0; i < parts.length - 1; i++) {
        const parent = current
        current = `${current}/${parts[i]}`
        if (!childrenMap.has(parent))
          childrenMap.set(parent, [])

        const siblings = childrenMap.get(parent)!
        if (!siblings.includes(current))
          siblings.push(current)
      }
    }

    const buildNode = (nodePath: string): FolderNode => {
      const childPaths = childrenMap.get(nodePath) ?? []
      const name       = nodePath.split(SEPARATOR).pop() || nodePath
      return FolderNode.of(nodePath, name, childPaths.map(buildNode))
    }

    nodes.push(buildNode(rootPath))
  }

  return nodes
}

/** Depth-first search for the node at `path`; `null` when it is not in the tree. */
export function findFolder (folders: readonly FolderNode[], path: string): FolderNode | null {
  for (const folder of folders) {
    if (folder.path === path)
      return folder

    const found = findFolder(folder.children, path)
    if (found)
      return found
  }

  return null
}

/**
 * How many of `tracks` live at or under each of `paths`, subfolders included.
 *
 * One pass over the library, not one per folder — the children are siblings
 * under one parent, so a track belongs to at most one of them: walking the
 * tracks once and bucketing each into the child whose prefix it carries gives
 * the same answer in O(tracks) rather than O(children × tracks).
 */
function countsUnder (tracks: readonly Track[], paths: readonly string[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>(paths.map(path =>
    [ path, 0 ]))

  // The separator is part of the prefix, so `/music/rock/` cannot claim a track
  // under `/music/rock-live/` — which is why one `break` per track is safe.
  const prefixes = paths.map(path =>
    ({ path, prefix: `${path}/` }))

  for (const track of tracks)
    for (const { path, prefix } of prefixes)
      if (track.path.startsWith(prefix)) {
        counts.set(path, (counts.get(path) ?? 0) + 1)
        break
      }

  return counts
}

/**
 * The rows to list above the tracks for the current location.
 *
 * With no folder selected that is the library roots, which is what makes a
 * multi-root library browsable from the top rather than only from the tree.
 */
export function subfolderRows (
  folders: readonly FolderNode[],
  selectedPath: string | null,
  tracks: readonly Track[]
): readonly FolderRow[] {
  const children = selectedPath === null
    ? folders
    : findFolder(folders, selectedPath)?.children ?? []

  const counts = countsUnder(tracks, children.map(child =>
    child.path))

  return children.map(child =>
    ({
      path:       child.path,
      name:       child.name,
      trackCount: counts.get(child.path) ?? 0,
    }))
}

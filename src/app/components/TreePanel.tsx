import type { Track, TreeGroupBy } from '../state/types'


type TreeNode = { label: string; count: number; key: string }

const getFolderName = (path: string): string => {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 2] ?? 'Unknown'
}

const buildNodes = (tracks: readonly Track[], groupBy: TreeGroupBy): TreeNode[] => {
  const map = new Map<string, number>()

  for (const t of tracks) {
    let key: string
    switch (groupBy) {
      case 'artist': key = t.artist; break
      case 'album':  key = t.album;  break
      case 'folder': key = getFolderName(t.path); break
      default:       key = t.artist
    }
    map.set(key, (map.get(key) ?? 0) + 1)
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => ({ label, count, key: label }))
}

type Props = {
  tracks: readonly Track[]
  groupBy: TreeGroupBy
  selectedNode: string | null
  expanded: boolean
  onToggle: () => void
  onNodeSelect: (key: string | null) => void
  onGroupChange: (groupBy: TreeGroupBy) => void
}

export const TreePanel = ({ tracks, groupBy, selectedNode, expanded, onToggle, onNodeSelect, onGroupChange }: Props) => {
  const nodes = buildNodes(tracks, groupBy)
  const titleText = groupBy === 'folder' ? 'Folders' : groupBy === 'artist' ? 'Artists' : 'Albums'

  return (
    <div id="library-tree" className={`tree-panel${!expanded ? ' collapsed' : ''}`}>
      <div className="tree-toolbar">
        <button
          className="tree-toggle-btn"
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          title={expanded ? 'Collapse' : 'Expand'}
          onClick={(e) => { e.stopPropagation(); onToggle() }}
        >
          {expanded ? '◁' : '▷'}
        </button>

        {expanded && (
          <>
            <span className="tree-title">{titleText}</span>
            <div className="tree-groupby-tabs">
              <button
                className={`tree-groupby-btn${groupBy === 'artist' ? ' active' : ''}`}
                data-group="artist"
                title="Group by Artist"
                onClick={(e) => { e.stopPropagation(); onGroupChange('artist') }}
              >
                ♪
              </button>
              <button
                className={`tree-groupby-btn${groupBy === 'album' ? ' active' : ''}`}
                data-group="album"
                title="Group by Album"
                onClick={(e) => { e.stopPropagation(); onGroupChange('album') }}
              >
                ◼
              </button>
              <button
                className={`tree-groupby-btn${groupBy === 'folder' ? ' active' : ''}`}
                data-group="folder"
                title="Group by Folder"
                onClick={(e) => { e.stopPropagation(); onGroupChange('folder') }}
              >
                ⊞
              </button>
            </div>
          </>
        )}
      </div>

      {expanded && (
        <ul className="tree-list" role="tree" aria-label="Library navigation">
          <li
            className={`tree-node${selectedNode === null ? ' selected' : ''}`}
            role="treeitem"
            data-node=""
            aria-selected={selectedNode === null}
            onClick={() => onNodeSelect(null)}
          >
            <span className="tree-node-label">All tracks</span>
            <span className="tree-node-count">{tracks.length}</span>
          </li>

          {nodes.map(n => (
            <li
              key={n.key}
              className={`tree-node${selectedNode === n.key ? ' selected' : ''}`}
              role="treeitem"
              data-node={n.key}
              aria-selected={selectedNode === n.key}
              tabIndex={0}
              onClick={() => onNodeSelect(n.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onNodeSelect(n.key)
                }
              }}
            >
              <span className="tree-node-label" title={n.label}>{n.label}</span>
              <span className="tree-node-count">{n.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

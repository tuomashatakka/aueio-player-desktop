import type { Track, TreeGroupBy } from '../state/types'
import { escapeHtml } from '../utils/dom'


type TreeNode = {
  label: string
  count: number
  key: string
}

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
      case 'album':  key = t.album; break
      case 'folder': key = getFolderName(t.path); break
      default:       key = t.artist
    }
    map.set(key, (map.get(key) ?? 0) + 1)
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => ({ label, count, key: label }))
}

/**
 * <aueio-tree-panel>
 * Foldable sidebar with grouped track navigation.
 *
 * Properties:
 *   tracks: readonly Track[]
 *   groupBy: TreeGroupBy
 *   selectedNode: string | null
 *   expanded: boolean
 *
 * Dispatches:
 *   aueio-tree-toggle               – toggle panel collapse
 *   aueio-tree-node-select { key }  – node clicked
 *   aueio-tree-group-change { groupBy } – groupBy changed
 */
export class AueioTreePanel extends HTMLElement {
  #tracks: readonly Track[] = []
  #groupBy: TreeGroupBy = 'artist'
  #selectedNode: string | null = null
  #expanded = true
  // Track which nodes are internally folded
  #collapsed = new Set<string>()

  set tracks (t: readonly Track[]) { this.#tracks = t; if (this.isConnected) this.#render() }
  set groupBy (g: TreeGroupBy) { this.#groupBy = g; if (this.isConnected) this.#render() }
  set selectedNode (n: string | null) { this.#selectedNode = n; if (this.isConnected) this.#render() }
  set expanded (v: boolean) { this.#expanded = v; if (this.isConnected) this.#render() }

  connectedCallback (): void {
    this.className = 'tree-panel'
    this.#render()
  }

  #render (): void {
    this.classList.toggle('collapsed', !this.#expanded)

    const nodes = buildNodes(this.#tracks, this.#groupBy)

    this.innerHTML = `
      <div class="tree-toolbar">
        <button class="tree-toggle-btn" aria-label="${this.#expanded ? 'Collapse sidebar' : 'Expand sidebar'}" title="${this.#expanded ? 'Collapse' : 'Expand'}">
          ${this.#expanded ? '◁' : '▷'}
        </button>
        ${this.#expanded ? `
          <span class="tree-title">${this.#groupBy === 'folder' ? 'Folders' : this.#groupBy === 'artist' ? 'Artists' : 'Albums'}</span>
          <div class="tree-groupby-tabs">
            <button class="tree-groupby-btn${this.#groupBy === 'artist' ? ' active' : ''}" data-group="artist" title="Group by Artist">♪</button>
            <button class="tree-groupby-btn${this.#groupBy === 'album' ? ' active' : ''}" data-group="album" title="Group by Album">◼</button>
            <button class="tree-groupby-btn${this.#groupBy === 'folder' ? ' active' : ''}" data-group="folder" title="Group by Folder">⊞</button>
          </div>
        ` : ''}
      </div>
      ${this.#expanded ? `
        <ul class="tree-list" role="tree" aria-label="Library navigation">
          <li class="tree-node${this.#selectedNode === null ? ' selected' : ''}" role="treeitem" data-node="" aria-selected="${this.#selectedNode === null}">
            <span class="tree-node-label">All tracks</span>
            <span class="tree-node-count">${this.#tracks.length}</span>
          </li>
          ${nodes.map(n => `
            <li class="tree-node${this.#selectedNode === n.key ? ' selected' : ''}" role="treeitem" data-node="${escapeHtml(n.key)}" aria-selected="${this.#selectedNode === n.key}" tabindex="0">
              <span class="tree-node-label" title="${escapeHtml(n.label)}">${escapeHtml(n.label)}</span>
              <span class="tree-node-count">${n.count}</span>
            </li>
          `).join('')}
        </ul>
      ` : ''}
    `

    // Bind events
    this.querySelector('.tree-toggle-btn')?.addEventListener('click', (e: Event) => {
      e.stopPropagation()
      this.dispatchEvent(new CustomEvent('aueio-tree-toggle', { bubbles: true }))
    })

    this.querySelectorAll<HTMLElement>('[data-group]').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        e.stopPropagation()
        this.dispatchEvent(new CustomEvent('aueio-tree-group-change', {
          bubbles: true,
          detail: { groupBy: btn.dataset['group'] as TreeGroupBy },
        }))
      })
    })

    this.querySelectorAll<HTMLElement>('[data-node]').forEach(node => {
      node.addEventListener('click', () => {
        const key = node.dataset['node'] ?? ''
        this.dispatchEvent(new CustomEvent('aueio-tree-node-select', {
          bubbles: true,
          detail: { key: key || null },
        }))
      })
      node.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          const key = node.dataset['node'] ?? ''
          this.dispatchEvent(new CustomEvent('aueio-tree-node-select', {
            bubbles: true,
            detail: { key: key || null },
          }))
        }
      })
    })
  }
}

customElements.define('aueio-tree-panel', AueioTreePanel)

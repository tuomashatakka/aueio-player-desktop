import type { SortKey, SortDir } from '../state/types'


type ColDef = {
  key: SortKey | ''
  label: string
  cls: string
}

const COLUMNS: ColDef[] = [
  { key: '',            label: '#',         cls: 'tr-num' },
  { key: '',            label: '',          cls: 'tr-indicator' },
  { key: '',            label: '',          cls: 'tr-cover' },
  { key: 'title',       label: 'Title',     cls: 'tr-title' },
  { key: 'artist',      label: 'Artist',    cls: 'tr-artist' },
  { key: 'album',       label: 'Album',     cls: 'tr-album' },
  { key: 'genre',       label: 'Genre',     cls: 'tr-genre' },
  { key: 'year',        label: 'Year',      cls: 'tr-year' },
  { key: 'duration',    label: 'Time',      cls: 'tr-duration' },
  { key: 'rating',      label: 'Rating',    cls: 'tr-rating' },
  { key: '',            label: '',          cls: 'tr-edit-btn' },
]

/**
 * <aueio-sort-header>
 * The sticky header row for the track table.
 *
 * Attributes:
 *   sort-key  – current SortKey
 *   sort-dir  – 'asc' | 'desc'
 *
 * Dispatches:
 *   aueio-sort-change  { key, dir } – when a sortable column is clicked
 */
export class AueioSortHeader extends HTMLElement {
  static observedAttributes = ['sort-key', 'sort-dir']

  get sortKey (): SortKey { return (this.getAttribute('sort-key') ?? 'title') as SortKey }
  get sortDir (): SortDir { return (this.getAttribute('sort-dir') ?? 'asc') as SortDir }

  connectedCallback (): void {
    this.setAttribute('role', 'row')
    this.#render()
  }

  attributeChangedCallback (): void {
    if (this.isConnected) this.#render()
  }

  #render (): void {
    const sortKey = this.sortKey
    const sortDir = this.sortDir

    this.innerHTML = COLUMNS.map(col => {
      const isActive = col.key && col.key === sortKey
      const indicator = isActive ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''
      const sortable = col.key !== ''

      return `<span
        class="sort-cell ${col.cls}${isActive ? ' sort-active' : ''}"
        role="columnheader"
        ${sortable ? `data-sort-key="${col.key}" tabindex="0" aria-sort="${isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}"` : ''}
      >${col.label}${indicator}</span>`
    }).join('')

    this.querySelectorAll<HTMLElement>('[data-sort-key]').forEach(cell => {
      cell.addEventListener('click', () => this.#onCellClick(cell.dataset['sortKey'] as SortKey))
      cell.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          this.#onCellClick(cell.dataset['sortKey'] as SortKey)
        }
      })
    })
  }

  #onCellClick (key: SortKey): void {
    const currentKey = this.sortKey
    const currentDir = this.sortDir
    const dir: SortDir = key === currentKey && currentDir === 'asc' ? 'desc' : 'asc'

    this.dispatchEvent(new CustomEvent('aueio-sort-change', {
      bubbles: true,
      detail: { key, dir },
    }))
  }
}

customElements.define('aueio-sort-header', AueioSortHeader)

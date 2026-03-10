import type { Track } from '../state/types'
import { escapeHtml, formatTime } from '../utils/dom'
import { getTrackEmoji } from '../utils/audio'


/**
 * <aueio-track-row>
 * A single track row for the library table.
 *
 * Properties (set via JS, not attributes for complex types):
 *   trackData: Track
 *   trackIndex: number
 *
 * Attributes (reflected):
 *   current  – boolean, this track is selected
 *   playing  – boolean, this track is playing
 *
 * Dispatches:
 *   aueio-track-play  { idx }          – row clicked to play
 *   aueio-track-edit  { idx, track }   – edit button clicked
 *   aueio-rating-change { idx, rating } – star rating changed
 */
export class AueioTrackRow extends HTMLElement {
  static observedAttributes = ['current', 'playing']

  #track: Track | null = null
  #idx = -1

  set trackData (t: Track) {
    this.#track = t
    if (this.isConnected) this.#render()
  }

  set trackIndex (i: number) {
    this.#idx = i
    if (this.isConnected) this.#render()
  }

  connectedCallback (): void {
    this.#render()
    this.setAttribute('role', 'row')
    this.setAttribute('tabindex', '0')
  }

  attributeChangedCallback (): void {
    if (this.isConnected) this.#render()
  }

  #render (): void {
    const t = this.#track
    if (!t) return

    const idx = this.#idx
    const isCurrent = this.hasAttribute('current')
    const isPlaying = this.hasAttribute('playing')
    const color = t.coverColor ?? 'hsl(220,60%,40%)'
    const emoji = getTrackEmoji(t)

    this.className = `track-row${isCurrent ? ' current' : ''}${isPlaying ? ' playing' : ''}`

    this.innerHTML = `
      <span class="tr-num" role="gridcell">${idx + 1}</span>

      <span class="tr-indicator" role="gridcell" aria-hidden="true">
        ${isPlaying
          ? `<aueio-playing-bars></aueio-playing-bars>`
          : isCurrent
            ? `<span class="tr-current-dot"></span>`
            : ''
        }
      </span>

      <span class="tr-cover" role="gridcell">
        <span class="track-cover-bg" style="background:${color}"></span>
        <span class="track-cover-icon">${emoji}</span>
      </span>

      <span class="tr-title" role="gridcell" title="${escapeHtml(t.title)}">
        ${escapeHtml(t.title)}
      </span>

      <span class="tr-artist" role="gridcell" data-editable="artist" title="${escapeHtml(t.artist)}">
        ${escapeHtml(t.artist)}
      </span>

      <span class="tr-album" role="gridcell" data-editable="album" title="${escapeHtml(t.album)}">
        ${escapeHtml(t.album)}
      </span>

      <span class="tr-genre" role="gridcell" data-editable="genre">
        ${escapeHtml(t.genre ?? '')}
      </span>

      <span class="tr-year" role="gridcell" data-editable="year">
        ${t.year ? String(t.year) : ''}
      </span>

      <span class="tr-duration" role="gridcell">
        ${t.duration > 0 ? formatTime(t.duration) : '—'}
      </span>

      <aueio-star-rating
        class="tr-rating"
        role="gridcell"
        value="${t.rating ?? 0}"
        data-idx="${idx}"
      ></aueio-star-rating>

      <button class="tr-edit-btn" aria-label="Edit tags" title="Edit tags" data-idx="${idx}">
        ✎
      </button>
    `

    // Play on row click (but not on star or edit button clicks)
    this.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement
      if (target.closest('.tr-edit-btn') || target.closest('aueio-star-rating'))
        return
      this.dispatchEvent(new CustomEvent('aueio-track-play', {
        bubbles: true,
        detail: { idx },
      }))
    })

    this.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        this.dispatchEvent(new CustomEvent('aueio-track-play', {
          bubbles: true,
          detail: { idx },
        }))
      }
    })

    // Edit button
    const editBtn = this.querySelector<HTMLButtonElement>('.tr-edit-btn')
    editBtn?.addEventListener('click', (e: Event) => {
      e.stopPropagation()
      this.dispatchEvent(new CustomEvent('aueio-track-edit', {
        bubbles: true,
        detail: { idx, track: t },
      }))
    })

    // Editable cells (artist, album, genre, year) → open tag editor
    this.querySelectorAll<HTMLElement>('[data-editable]').forEach(cell => {
      cell.addEventListener('click', (e: Event) => {
        e.stopPropagation()
        this.dispatchEvent(new CustomEvent('aueio-track-edit', {
          bubbles: true,
          detail: { idx, track: t, focusField: cell.dataset['editable'] },
        }))
      })
    })

    // Star rating
    this.querySelector('aueio-star-rating')?.addEventListener('aueio-rating-change', (e: Event) => {
      const detail = (e as CustomEvent).detail as { rating: number }
      e.stopPropagation()
      this.dispatchEvent(new CustomEvent('aueio-track-rating', {
        bubbles: true,
        detail: { idx, rating: detail.rating },
      }))
    })
  }
}

customElements.define('aueio-track-row', AueioTrackRow)

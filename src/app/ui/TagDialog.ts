import type { Track } from '../state/types'
import { escapeHtml } from '../utils/dom'


/**
 * <aueio-tag-dialog>
 * Full-screen modal for editing all track tags.
 *
 * Usage:
 *   const dialog = document.querySelector('aueio-tag-dialog') as AueioTagDialog
 *   dialog.open(track, idx, focusField?)
 *
 * Dispatches:
 *   aueio-tag-save  { idx, tags }  – on form submit
 *   aueio-tag-close               – on close / cancel
 */

type TagField = {
  key: keyof Track
  label: string
  type: 'text' | 'number'
  editable: boolean
}

const FIELDS: TagField[] = [
  { key: 'title',       label: 'Title',        type: 'text',   editable: true },
  { key: 'artist',      label: 'Artist',       type: 'text',   editable: true },
  { key: 'album',       label: 'Album',        type: 'text',   editable: true },
  { key: 'genre',       label: 'Genre',        type: 'text',   editable: true },
  { key: 'year',        label: 'Year',         type: 'number', editable: true },
  { key: 'trackNumber', label: 'Track #',      type: 'number', editable: true },
  { key: 'diskNumber',  label: 'Disk #',       type: 'number', editable: true },
  { key: 'comment',     label: 'Comment',      type: 'text',   editable: true },
  { key: 'duration',    label: 'Duration (s)', type: 'number', editable: false },
  { key: 'path',        label: 'File Path',    type: 'text',   editable: false },
]

export class AueioTagDialog extends HTMLElement {
  #dialog: HTMLDialogElement | null = null
  #track: Track | null = null
  #idx = -1
  #focusField: string | null = null

  connectedCallback (): void {
    this.#build()
  }

  open (track: Track, idx: number, focusField?: string): void {
    this.#track = track
    this.#idx = idx
    this.#focusField = focusField ?? null
    this.#populate()
    this.#dialog?.showModal()

    if (focusField) {
      const input = this.#dialog?.querySelector<HTMLElement>(`[data-field="${focusField}"]`)
      input?.focus()
    }
  }

  close (): void {
    this.#dialog?.close()
  }

  #build (): void {
    const dialog = document.createElement('dialog')
    dialog.className = 'tag-dialog'
    dialog.innerHTML = `
      <header class="tag-dialog-header">
        <h2 class="tag-dialog-title">Edit Tags</h2>
        <button class="tag-dialog-close" aria-label="Close" type="button">✕</button>
      </header>
      <form class="tag-dialog-form" method="dialog">
        <div class="tag-dialog-cover" id="tag-dialog-cover"></div>
        <div class="tag-dialog-fields" id="tag-dialog-fields"></div>
        <footer class="tag-dialog-footer">
          <button type="button" class="tag-dialog-cancel">Cancel</button>
          <button type="submit" class="tag-dialog-save" data-variant="primary">Save</button>
        </footer>
      </form>
    `

    dialog.querySelector('.tag-dialog-close')?.addEventListener('click', () => this.#handleCancel())
    dialog.querySelector('.tag-dialog-cancel')?.addEventListener('click', () => this.#handleCancel())
    dialog.querySelector('.tag-dialog-form')?.addEventListener('submit', (e: Event) => {
      e.preventDefault()
      this.#handleSave()
    })

    dialog.addEventListener('close', () => {
      this.dispatchEvent(new CustomEvent('aueio-tag-close', { bubbles: true }))
    })

    // Close on backdrop click
    dialog.addEventListener('click', (e: MouseEvent) => {
      if (e.target === dialog) this.#handleCancel()
    })

    this.append(dialog)
    this.#dialog = dialog
  }

  #populate (): void {
    const t = this.#track
    if (!t || !this.#dialog) return

    const coverEl = this.#dialog.querySelector<HTMLElement>('#tag-dialog-cover')
    if (coverEl) {
      const color = t.coverColor ?? 'hsl(220,60%,40%)'
      coverEl.innerHTML = `
        <span class="tag-dialog-cover-art" style="background:${color}">
          <span class="tag-dialog-cover-label">${escapeHtml(t.title[0] ?? '?').toUpperCase()}</span>
        </span>
        <div class="tag-dialog-cover-info">
          <div class="tag-dialog-cover-title">${escapeHtml(t.title)}</div>
          <div class="tag-dialog-cover-artist">${escapeHtml(t.artist)}</div>
        </div>
      `
    }

    const fieldsEl = this.#dialog.querySelector<HTMLElement>('#tag-dialog-fields')
    if (!fieldsEl) return

    fieldsEl.innerHTML = FIELDS.map(f => {
      const raw = t[f.key]
      const val = raw !== undefined && raw !== null ? String(raw) : ''
      const inputId = `tag-field-${f.key}`

      if (!f.editable) {
        return `
          <div class="tag-field tag-field--readonly">
            <label class="tag-label" for="${inputId}">${escapeHtml(f.label)}</label>
            <span class="tag-value-readonly" id="${inputId}">${escapeHtml(val)}</span>
          </div>
        `
      }

      return `
        <div class="tag-field">
          <label class="tag-label" for="${inputId}">${escapeHtml(f.label)}</label>
          <input
            class="tag-input"
            id="${inputId}"
            data-field="${f.key}"
            type="${f.type}"
            value="${escapeHtml(val)}"
            ${f.type === 'number' ? 'min="0" step="1"' : ''}
          />
        </div>
      `
    }).join('')
  }

  #handleSave (): void {
    if (!this.#dialog || !this.#track) return

    const tags: Partial<Track> = {}
    const inputs = this.#dialog.querySelectorAll<HTMLInputElement>('.tag-input[data-field]')

    for (const input of inputs) {
      const field = input.dataset['field'] as keyof Track
      const val = input.value.trim()

      if (input.type === 'number') {
        const n = Number(val)
        if (!Number.isNaN(n) && val !== '') {
          (tags as Record<string, unknown>)[field] = n
        } else if (val === '') {
          (tags as Record<string, unknown>)[field] = undefined
        }
      } else {
        (tags as Record<string, unknown>)[field] = val
      }
    }

    this.dispatchEvent(new CustomEvent('aueio-tag-save', {
      bubbles: true,
      detail: { idx: this.#idx, tags },
    }))

    this.#dialog.close()
  }

  #handleCancel (): void {
    this.#dialog?.close()
  }
}

customElements.define('aueio-tag-dialog', AueioTagDialog)

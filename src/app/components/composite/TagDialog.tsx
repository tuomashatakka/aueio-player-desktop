import { useRef, useEffect, memo, useCallback } from 'react'
import type { Track } from '../../state/types'
import { ActionType } from '../../state/actions'
import { useSelector, useDispatch } from '../../hooks/useSelector'
import { selectTagEditingIndex, selectFilteredTracks } from '../../selectors/index'


type TagField = {
  readonly key:      keyof Track
  readonly label:    string
  readonly type:     'text' | 'number'
  readonly editable: boolean
}

const FIELDS: readonly TagField[] = [
  { key: 'title', label: 'Title', type: 'text', editable: true },
  { key: 'artist', label: 'Artist', type: 'text', editable: true },
  { key: 'album', label: 'Album', type: 'text', editable: true },
  { key: 'genre', label: 'Genre', type: 'text', editable: true },
  { key: 'year', label: 'Year', type: 'number', editable: true },
  { key: 'trackNumber', label: 'Track #', type: 'number', editable: true },
  { key: 'diskNumber', label: 'Disk #', type: 'number', editable: true },
  { key: 'comment', label: 'Comment', type: 'text', editable: true },
  { key: 'duration', label: 'Duration (s)', type: 'number', editable: false },
  { key: 'path', label: 'File Path', type: 'text', editable: false },
]

type Props = {
  readonly onSave: (idx: number, tags: Partial<Track>) => void
}

export const TagDialog = memo(({ onSave }: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const dispatch = useDispatch()
  const tagEditingIndex = useSelector(selectTagEditingIndex)
  const filteredTracks  = useSelector(selectFilteredTracks)

  const track = tagEditingIndex === null
    ? null
    : filteredTracks[tagEditingIndex] ?? null

  // Sync dialog open/close with state
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog)
      return

    if (tagEditingIndex !== null && !dialog.open) {
      dialog.showModal()
    }
    else if (tagEditingIndex === null && dialog.open) {
      dialog.close()
    }
  }, [ tagEditingIndex ])

  const handleClose = useCallback(() => {
    dispatch({ type: ActionType.TAG_EDIT_CLOSED })
  }, [ dispatch ])

  const handleSave = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (tagEditingIndex === null)
      return

    const form = e.currentTarget
    const tags: Partial<Track> = {}
    const inputs = form.querySelectorAll<HTMLInputElement>('.tag-input[data-field]')

    for (const input of inputs) {
      const field = input.dataset.field as keyof Track
      const val = input.value.trim()

      if (input.type === 'number') {
        const n = Number(val)
        if (!Number.isNaN(n) && val !== '') {
          (tags as Record<string, unknown>)[field] = n
        }
        else if (val === '') {
          (tags as Record<string, unknown>)[field] = undefined
        }
      }
      else {
        (tags as Record<string, unknown>)[field] = val
      }
    }

    onSave(tagEditingIndex, tags)
    dispatch({ type: ActionType.TAG_EDIT_CLOSED })
  }, [ tagEditingIndex, onSave, dispatch ])

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current)
      handleClose()
  }, [ handleClose ])

  return (
    <div id='library-tag-dialog'>
      <dialog
        ref={dialogRef}
        className='tag-dialog'
        onClose={handleClose}
        onClick={handleBackdropClick}
      >
        <header className='tag-dialog-header'>
          <h2 className='tag-dialog-title'>Edit Tags</h2>

          <button
            className='tag-dialog-close'
            aria-label='Close'
            type='button'
            onClick={handleClose}
          >
            ✕
          </button>
        </header>

        {/* key resets form inputs when editing a different track */}
        <form
          key={tagEditingIndex ?? 'none'}
          className='tag-dialog-form'
          onSubmit={handleSave}
        >
          {track &&
            <div className='tag-dialog-cover' id='tag-dialog-cover'>
              <span
                className='tag-dialog-cover-art'
                style={{ background: track.coverColor ?? 'hsl(220,60%,40%)' }}
              >
                <span className='tag-dialog-cover-label'>
                  {(track.title[0] ?? '?').toUpperCase()}
                </span>
              </span>

              <div className='tag-dialog-cover-info'>
                <div className='tag-dialog-cover-title'>{track.title}</div>
                <div className='tag-dialog-cover-artist'>{track.artist}</div>
              </div>
            </div>
          }

          <div className='tag-dialog-fields' id='tag-dialog-fields'>
            {FIELDS.map(f => {
              const raw = track ? track[f.key] : undefined
              const val = raw !== undefined && raw !== null ? String(raw) : ''
              const inputId = `tag-field-${f.key}`

              if (!f.editable) {
                return (
                  <div key={f.key} className='tag-field tag-field--readonly'>
                    <label className='tag-label' htmlFor={inputId}>{f.label}</label>
                    <span className='tag-value-readonly' id={inputId}>{val}</span>
                  </div>
                )
              }

              return (
                <div key={f.key} className='tag-field'>
                  <label className='tag-label' htmlFor={inputId}>{f.label}</label>

                  <input
                    className='tag-input'
                    id={inputId}
                    data-field={f.key}
                    type={f.type}
                    defaultValue={val}
                    min={f.type === 'number' ? 0 : undefined}
                    step={f.type === 'number' ? 1 : undefined}
                  />
                </div>
              )
            })}
          </div>

          <footer className='tag-dialog-footer'>
            <button type='button' className='tag-dialog-cancel' onClick={handleClose}>Cancel</button>
            <button type='submit' className='tag-dialog-save' data-variant='primary'>Save</button>
          </footer>
        </form>
      </dialog>
    </div>
  )
})

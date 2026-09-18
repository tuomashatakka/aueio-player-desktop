/**
 * The tag editor dialog: `<form method="dialog">`, primary fields plus a
 * `<details>` for the rest. Uncontrolled (`defaultValue` + `FormData` on
 * submit), `key`ed on the editing track's id so React remounts — and so
 * resets — the form when the target track changes, with no effect needed.
 * See AGENTS.md L8 and `TagEditorView`'s docstring in the original app for
 * why saving never touches the audio file itself.
 */
import type { FormEvent, ReactElement } from 'react'
import type { TagPatchJSON } from '../../../shared/dto'
import { useStore, useStores } from '../hooks/useStore'


export function TagEditor (): ReactElement {
  const stores = useStores()

  const editingTrackId = useStore(stores.ui, state =>
    state.editingTrackId)
  const byId = useStore(stores.library, state =>
    state.byId)

  const track = editingTrackId ? byId.get(editingTrackId) : undefined

  function onSubmit (event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (!track)
      return

    const form                = new FormData(event.currentTarget)
    const patch: TagPatchJSON = {
      title:  String(form.get('title') ?? ''),
      artist: String(form.get('artist') ?? ''),
      album:  String(form.get('album') ?? ''),
    }

    stores.library.dispatch({ type: 'library/tagsPatchRequested', id: track.id, patch })
    stores.ui.dispatch({ type: 'ui/tagEditorClosed' })
  }

  function onCancel (): void {
    stores.ui.dispatch({ type: 'ui/tagEditorClosed' })
  }

  return <form key={ track?.id ?? 'none' } method="dialog" onSubmit={ onSubmit }>
    <fieldset>
      <legend>Tags</legend>

      <label>
        Title
        <input type="text" name="title" defaultValue={ track?.title ?? '' } />
      </label>

      <label>
        Artist
        <input type="text" name="artist" defaultValue={ track?.artist ?? '' } />
      </label>
    </fieldset>

    <details>
      <summary>More</summary>

      <label>
        Album
        <input type="text" name="album" defaultValue={ track?.album ?? '' } />
      </label>
    </details>

    <menu>
      <li>
        <button type="submit" className="button primary">Save</button>
      </li>

      <li>
        <button type="button" className="button ghost" onClick={ onCancel }>Cancel</button>
      </li>
    </menu>
  </form>
}

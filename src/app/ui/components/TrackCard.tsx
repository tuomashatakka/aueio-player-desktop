/** One grid card for a track — the `grid-*` density equivalent of `TrackRow`. */
import type { DragEvent, MouseEvent, ReactElement } from 'react'
import type { Track } from '../../domain'
import { DRAG_MIME, serializeDragPayload } from '../../domain'
import { useStores } from '../hooks/useStore'


interface TrackCardContext {
  readonly orderedIds:  readonly string[]
  readonly selectedIds: ReadonlySet<string>
}

interface TrackCardProps {
  readonly track:    Track
  readonly index:    number
  readonly selected: boolean
  readonly context:  TrackCardContext
}

export function TrackCard ({ track, index, selected, context }: TrackCardProps): ReactElement {
  const stores = useStores()

  function onClick (event: MouseEvent<HTMLLIElement>): void {
    stores.ui.dispatch({
      type:       'ui/rowClicked',
      id:         track.id,
      orderedIds: context.orderedIds,
      toggle:     event.ctrlKey || event.metaKey,
      range:      event.shiftKey,
    })
  }

  function onDoubleClick (): void {
    stores.player.dispatch({ type: 'player/playRequested', ids: context.orderedIds, startIndex: index })
  }

  function onContextMenu (event: MouseEvent<HTMLLIElement>): void {
    event.preventDefault()
    stores.ui.dispatch({
      type:   'ui/contextMenuRequested',
      menuId: 'card',
      items:  [
        { id: 'play', label: 'Play' },
        { id: 'edit-tags', label: 'Edit Tags' },
      ],
      x: event.clientX,
      y: event.clientY,
    })
  }

  function onDragStart (event: DragEvent<HTMLLIElement>): void {
    const trackIds = context.selectedIds.has(track.id) && context.selectedIds.size > 1
      ? Array.from(context.selectedIds)
      : [ track.id ]

    event.dataTransfer.setData(DRAG_MIME, serializeDragPayload({ kind: 'tracks', trackIds, label: track.displayTitle }))
  }

  return <li
    aria-selected={ selected }
    data-track-id={ track.id }
    data-selected={ selected }
    tabIndex={ -1 }
    draggable
    onClick={ onClick }
    onContextMenu={ onContextMenu }
    onDoubleClick={ onDoubleClick }
    onDragStart={ onDragStart }>
    <article>
      <figure className="cover">
        <img data-art-id={ track.artId ?? '' } alt="" loading="lazy" decoding="async" />
      </figure>

      <p className="truncate">{track.displayTitle}</p>
      <p className="truncate">{track.artist}</p>
    </article>
  </li>
}

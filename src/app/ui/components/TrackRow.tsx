/** One `<tr>` of the flat track table — selection, play, context menu and drag source. */
import type { DragEvent, MouseEvent, ReactElement } from 'react'
import type { ColumnConfig } from '../../state/ui'
import type { Track } from '../../domain'
import { DRAG_MIME, serializeDragPayload } from '../../domain'
import { useStores } from '../hooks/useStore'
import { TrackCell } from './TrackCell'


export interface TrackRowContext {
  readonly columns:     readonly ColumnConfig[]
  readonly orderedIds:  readonly string[]
  readonly selectedIds: ReadonlySet<string>
}

interface TrackRowProps {
  readonly track:    Track
  readonly index:    number
  readonly selected: boolean
  readonly context:  TrackRowContext
}

export function TrackRow ({ track, index, selected, context }: TrackRowProps): ReactElement {
  const stores = useStores()

  function onClick (event: MouseEvent<HTMLTableRowElement>): void {
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

  function onContextMenu (event: MouseEvent<HTMLTableRowElement>): void {
    event.preventDefault()
    stores.ui.dispatch({
      type:   'ui/contextMenuRequested',
      menuId: 'track',
      items:  [
        { id: 'play', label: 'Play' },
        { id: 'edit-tags', label: 'Edit Tags' },
        { separator: true },
        { id: 'remove', label: 'Remove', danger: true },
      ],
      x: event.clientX,
      y: event.clientY,
    })
  }

  function onDragStart (event: DragEvent<HTMLTableRowElement>): void {
    const trackIds = context.selectedIds.has(track.id) && context.selectedIds.size > 1
      ? Array.from(context.selectedIds)
      : [ track.id ]

    event.dataTransfer.setData(DRAG_MIME, serializeDragPayload({ kind: 'tracks', trackIds, label: track.displayTitle }))
  }

  return <tr
    aria-selected={ selected }
    data-track-id={ track.id }
    data-selected={ selected }
    tabIndex={ -1 }
    draggable
    onClick={ onClick }
    onContextMenu={ onContextMenu }
    onDoubleClick={ onDoubleClick }
    onDragStart={ onDragStart }>
    {context.columns.map(column =>
      <TrackCell key={ column.key } track={ track } columnKey={ column.key } />)}
  </tr>
}

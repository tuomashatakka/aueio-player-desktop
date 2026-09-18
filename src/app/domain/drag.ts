/**
 * The one drag vocabulary the library and the sidebar share.
 *
 * Everything draggable describes itself as a {@link DragPayload}, and every
 * drop target resolves it back to tracks through {@link tracksForPayload}. A
 * drop target never has to know *what* was dragged, and nothing but ids
 * travels in the payload, so a drag that outlives a rescan lands on the
 * tracks that exist *now* rather than on a stale snapshot.
 *
 * Ported from desktop-audio/src/app/utils/dnd.ts, minus the `DataTransfer`
 * plumbing — that is DOM, and belongs in a service, not here. Serialising and
 * parsing the payload string is pure and stays.
 */
import type { Grouping } from './grouping'
import { bucketKey } from './grouping'
import { Track } from './Track'

/** Private to this app; a foreign drag never carries it. */
export const DRAG_MIME = 'application/x-aueio'

/** Selected rows. Ids rather than tracks — see the module docstring. */
export interface TracksDrag {
  readonly kind:     'tracks'
  readonly trackIds: readonly string[]
  readonly label:    string
}

/** A folder from the sidebar tree or from the table's folder rows. */
export interface FolderDrag {
  readonly kind:  'folder'
  readonly path:  string
  readonly label: string
}

/** An album or artist bucket — a grid card, or a group heading in the table. */
export interface GroupDrag {
  readonly kind:     'group'
  readonly grouping: Grouping
  readonly key:      string
  readonly label:    string
}

/** A playlist being moved or dropped onto. Carries no tracks of its own. */
export interface PlaylistDrag {
  readonly kind:  'playlist'
  readonly id:    string
  readonly label: string
}

export type DragPayload = TracksDrag | FolderDrag | GroupDrag | PlaylistDrag

/** The payload kinds that resolve to tracks, and so can join a playlist. */
export type MediaDrag = TracksDrag | FolderDrag | GroupDrag

export function isMediaDrag (payload: DragPayload): payload is MediaDrag {
  return payload.kind !== 'playlist'
}

/** Serialises a payload for the `DRAG_MIME` slot of a `DataTransfer`. */
export function serializeDragPayload (payload: DragPayload): string {
  return JSON.stringify(payload)
}

/** The payload `raw` encodes, or `null` for anything malformed. */
export function parseDragPayload (raw: string): DragPayload | null {
  if (!raw)
    return null

  try {
    const parsed = JSON.parse(raw) as DragPayload
    return parsed && typeof parsed.kind === 'string' ? parsed : null
  }
  catch {
    return null
  }
}

/**
 * Separator-insensitive comparison, because the two sides genuinely differ:
 * the scanner reports native paths while the sidebar tree builds its own with
 * `/`, so on Windows a literal prefix test matches nothing at all.
 */
function withinFolder (path: string, folder: string): boolean {
  const file = path.replace(/\\/g, '/')
  const dir  = folder.replace(/\\/g, '/').replace(/\/$/, '')
  return file === dir || file.startsWith(`${dir}/`)
}

/**
 * The tracks `payload` stands for, in `tracks` order.
 *
 * Folder drags match by path prefix rather than by exact parent, so dropping a
 * folder brings its subfolders' tracks with it.
 */
export function tracksForPayload<T extends Track> (
  payload: DragPayload,
  tracks: readonly T[]
): readonly T[] {
  switch (payload.kind) {
    case 'tracks': {
      const wanted = new Set(payload.trackIds)
      return tracks.filter(track =>
        wanted.has(track.id))
    }
    case 'folder':
      return tracks.filter(track =>
        withinFolder(track.path, payload.path))
    case 'group':
      return tracks.filter(track =>
        bucketKey(track, payload.grouping) === payload.key)
    default:
      return []
  }
}

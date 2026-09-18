/** Track-row selection: click, ctrl/cmd-click and shift-click semantics. */

export interface SelectionState {
  readonly anchor: string | null
  readonly ids:    ReadonlySet<string>
}

export interface ClickModifiers {
  readonly toggle: boolean
  readonly range:  boolean
}

export function createSelectionState (): SelectionState {
  return { anchor: null, ids: new Set() }
}

/**
 * The selection after a row at `id` is clicked, given `orderedIds` — the rows
 * as currently displayed, so a range click walks the same order the user sees.
 *
 * A plain click replaces the selection outright. A toggle click (ctrl/cmd)
 * flips `id`'s membership and moves the anchor to it. A range click (shift)
 * selects everything between the anchor and `id`, inclusive, and leaves the
 * anchor where it was.
 */
export function selectionAfterClick (
  selection: SelectionState,
  orderedIds: readonly string[],
  id: string,
  { toggle, range }: ClickModifiers
): SelectionState {
  if (range && selection.anchor !== null) {
    const from = orderedIds.indexOf(selection.anchor)
    const to   = orderedIds.indexOf(id)

    if (from === -1 || to === -1)
      return { anchor: id, ids: new Set([ id ]) }

    const start = Math.min(from, to)
    const end   = Math.max(from, to)
    return { anchor: selection.anchor, ids: new Set(orderedIds.slice(start, end + 1)) }
  }

  if (toggle) {
    const ids = new Set(selection.ids)
    if (ids.has(id))
      ids.delete(id)
    else
      ids.add(id)
    return { anchor: id, ids }
  }

  return { anchor: id, ids: new Set([ id ]) }
}

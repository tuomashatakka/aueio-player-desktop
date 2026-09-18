import { describe, expect, test } from 'bun:test'
import type { UiAction } from '../../../../src/app/state/ui/actions'
import { DEFAULT_COLUMNS, gridTemplate, reconcileColumns } from '../../../../src/app/state/ui/columns'
import type { ColumnConfig } from '../../../../src/app/state/ui/columns'
import { uiReducer } from '../../../../src/app/state/ui/reducer'
import { createSelectionState, selectionAfterClick } from '../../../../src/app/state/ui/selection'
import { createUiState } from '../../../../src/app/state/ui/state'
import type { UiState } from '../../../../src/app/state/ui/state'


describe('uiReducer', () => {
  const initial = createUiState()

  const cases: ReadonlyArray<{ name: string, state: UiState, action: UiAction, expect: (state: UiState) => void }> = [
    {
      name:   'viewChanged sets the view',
      state:  initial,
      action: { type: 'ui/viewChanged', view: 'settings' },
      expect: state => expect(state.view).toBe('settings'),
    },
    {
      name:   'overlayOpened/overlayClosed',
      state:  initial,
      action: { type: 'ui/overlayOpened', overlay: 'dsp' },
      expect: state => expect(state.overlay).toBe('dsp'),
    },
    {
      name:   'overlayClosed clears the overlay',
      state:  { ...initial, overlay: 'dsp' },
      action: { type: 'ui/overlayClosed' },
      expect: state => expect(state.overlay).toBeNull(),
    },
    {
      name:   'playerModeSet',
      state:  initial,
      action: { type: 'ui/playerModeSet', mode: 'analysis' },
      expect: state => expect(state.playerMode).toBe('analysis'),
    },
    {
      name:   'lyricsToggled flips the flag',
      state:  initial,
      action: { type: 'ui/lyricsToggled' },
      expect: state => expect(state.lyricsOpen).toBe(true),
    },
    {
      name:   'sidebarToggled flips the flag',
      state:  { ...initial, sidebarOpen: true },
      action: { type: 'ui/sidebarToggled' },
      expect: state => expect(state.sidebarOpen).toBe(false),
    },
    {
      name:   'folderSelected sets folder and clears the other three scope fields',
      state:  { ...initial, scope: { folder: null, playlist: 'pl-1', list: 'queue', group: { grouping: 'album', key: 'k', label: 'L' }}},
      action: { type: 'ui/folderSelected', path: '/music/rock' },
      expect: state => expect(state.scope).toEqual({ folder: '/music/rock', playlist: null, list: null, group: null }),
    },
    {
      name:   'playlistSelected sets playlist and clears the other three',
      state:  { ...initial, scope: { folder: '/music', playlist: null, list: null, group: null }},
      action: { type: 'ui/playlistSelected', id: 'pl-1' },
      expect: state => expect(state.scope).toEqual({ folder: null, playlist: 'pl-1', list: null, group: null }),
    },
    {
      name:   'listSelected sets list and clears the other three',
      state:  { ...initial, scope: { folder: '/music', playlist: null, list: null, group: null }},
      action: { type: 'ui/listSelected', list: 'history' },
      expect: state => expect(state.scope).toEqual({ folder: null, playlist: null, list: 'history', group: null }),
    },
    {
      name:   'groupSelected sets the group and keeps the folder, clearing playlist/list',
      state:  { ...initial, scope: { folder: '/music', playlist: 'pl-1', list: 'queue', group: null }},
      action: { type: 'ui/groupSelected', grouping: 'artist', key: 'k', label: 'L' },
      expect: state => expect(state.scope).toEqual({ folder: '/music', playlist: null, list: null, group: { grouping: 'artist', key: 'k', label: 'L' }}),
    },
    {
      name:   'densitySet',
      state:  initial,
      action: { type: 'ui/densitySet', density: 'compact' },
      expect: state => expect(state.density).toBe('compact'),
    },
    {
      name:   'groupingSet',
      state:  initial,
      action: { type: 'ui/groupingSet', grouping: 'album' },
      expect: state => expect(state.grouping).toBe('album'),
    },
    {
      name:   'sortSet',
      state:  initial,
      action: { type: 'ui/sortSet', key: 'artist', dir: 'desc' },
      expect: state => expect(state.sort).toEqual({ key: 'artist', dir: 'desc' }),
    },
    {
      name:   'columnToggled flips visibility for the given key only',
      state:  initial,
      action: { type: 'ui/columnToggled', key: 'year' },
      expect: state => {
        expect(state.columns.find(c => c.key === 'year')?.visible).toBe(true)
        expect(state.columns.find(c => c.key === 'title')?.visible).toBe(true)
      },
    },
    {
      name:   'columnResized sets the width for a resizable column',
      state:  initial,
      action: { type: 'ui/columnResized', key: 'artist', width: '200px' },
      expect: state => expect(state.columns.find(c => c.key === 'artist')?.width).toBe('200px'),
    },
    {
      name:   'columnResized is a no-op for a non-resizable column',
      state:  initial,
      action: { type: 'ui/columnResized', key: 'title', width: '999px' },
      expect: state => expect(state.columns.find(c => c.key === 'title')?.width).toBe('1fr'),
    },
    {
      name:   'columnReordered moves a column before another',
      state:  initial,
      action: { type: 'ui/columnReordered', key: 'format', beforeKey: 'title' },
      expect: state => {
        const keys = state.columns.map(c => c.key)
        expect(keys.indexOf('format')).toBeLessThan(keys.indexOf('title'))
      },
    },
    {
      name:   'columnReordered with beforeKey null moves the column to the end',
      state:  initial,
      action: { type: 'ui/columnReordered', key: 'art', beforeKey: null },
      expect: state => expect(state.columns.at(-1)?.key).toBe('art'),
    },
    {
      name:   'columnReset restores the defaults',
      state:  { ...initial, columns: [ initial.columns[0]! ]},
      action: { type: 'ui/columnReset' },
      expect: state => expect(state.columns).toEqual(DEFAULT_COLUMNS),
    },
    {
      name:   'rowClicked delegates to selectionAfterClick',
      state:  initial,
      action: { type: 'ui/rowClicked', id: 'b', orderedIds: [ 'a', 'b', 'c' ], toggle: false, range: false },
      expect: state => expect(state.selection).toEqual({ anchor: 'b', ids: new Set([ 'b' ]) }),
    },
    {
      name:   'selectionCleared empties the selection',
      state:  { ...initial, selection: { anchor: 'a', ids: new Set([ 'a' ]) }},
      action: { type: 'ui/selectionCleared' },
      expect: state => expect(state.selection).toEqual({ anchor: null, ids: new Set() }),
    },
    {
      name:   'tagEditorOpened sets editingTrackId and opens the tag-editor overlay',
      state:  initial,
      action: { type: 'ui/tagEditorOpened', id: 'a' },
      expect: state => {
        expect(state.editingTrackId).toBe('a')
        expect(state.overlay).toBe('tag-editor')
      },
    },
    {
      name:   'tagEditorClosed clears editingTrackId and the tag-editor overlay',
      state:  { ...initial, editingTrackId: 'a', overlay: 'tag-editor' },
      action: { type: 'ui/tagEditorClosed' },
      expect: state => {
        expect(state.editingTrackId).toBeNull()
        expect(state.overlay).toBeNull()
      },
    },
    {
      name:   'tagEditorClosed leaves an unrelated overlay alone',
      state:  { ...initial, editingTrackId: 'a', overlay: 'dsp' },
      action: { type: 'ui/tagEditorClosed' },
      expect: state => expect(state.overlay).toBe('dsp'),
    },
    {
      name:   'contextMenuRequested/Closed',
      state:  initial,
      action: { type: 'ui/contextMenuRequested', menuId: 'track', items: [], x: 10, y: 20 },
      expect: state => expect(state.contextMenu).toEqual({ menuId: 'track', items: [], x: 10, y: 20 }),
    },
    {
      name:   'contextMenuClosed clears it',
      state:  { ...initial, contextMenu: { menuId: 'track', items: [], x: 1, y: 1 }},
      action: { type: 'ui/contextMenuClosed' },
      expect: state => expect(state.contextMenu).toBeNull(),
    },
  ]

  for (const { name, state, action, expect: assert } of cases)
    test(name, () => {
      assert(uiReducer(state, action))
    })
})

describe('selectionAfterClick', () => {
  const ordered = [ 'a', 'b', 'c', 'd', 'e' ]

  test('plain click replaces the selection outright', () => {
    const selection = selectionAfterClick({ anchor: 'a', ids: new Set([ 'a', 'b' ]) }, ordered, 'c', { toggle: false, range: false })
    expect(selection).toEqual({ anchor: 'c', ids: new Set([ 'c' ]) })
  })

  test('toggle click adds an unselected id and moves the anchor to it', () => {
    const selection = selectionAfterClick({ anchor: 'a', ids: new Set([ 'a' ]) }, ordered, 'c', { toggle: true, range: false })
    expect(selection).toEqual({ anchor: 'c', ids: new Set([ 'a', 'c' ]) })
  })

  test('toggle click on a selected id removes it', () => {
    const selection = selectionAfterClick({ anchor: 'c', ids: new Set([ 'a', 'c' ]) }, ordered, 'c', { toggle: true, range: false })
    expect(selection).toEqual({ anchor: 'c', ids: new Set([ 'a' ]) })
  })

  test('range click selects from the anchor to the clicked id, inclusive, forward', () => {
    const selection = selectionAfterClick({ anchor: 'b', ids: new Set([ 'b' ]) }, ordered, 'd', { toggle: false, range: true })
    expect(selection).toEqual({ anchor: 'b', ids: new Set([ 'b', 'c', 'd' ]) })
  })

  test('range click selects backward just as well, anchor unchanged', () => {
    const selection = selectionAfterClick({ anchor: 'd', ids: new Set([ 'd' ]) }, ordered, 'b', { toggle: false, range: true })
    expect(selection).toEqual({ anchor: 'd', ids: new Set([ 'b', 'c', 'd' ]) })
  })

  test('range click with no anchor yet falls back to a plain click', () => {
    const selection = selectionAfterClick(createSelectionState(), ordered, 'c', { toggle: false, range: true })
    expect(selection).toEqual({ anchor: 'c', ids: new Set([ 'c' ]) })
  })

  test('range click whose anchor has scrolled out of `orderedIds` falls back to a plain click', () => {
    const selection = selectionAfterClick({ anchor: 'zzz', ids: new Set([ 'zzz' ]) }, ordered, 'c', { toggle: false, range: true })
    expect(selection).toEqual({ anchor: 'c', ids: new Set([ 'c' ]) })
  })

  test('toggle takes precedence over range only when range has no anchor to work from', () => {
    // range true, toggle true, but no anchor: range branch is skipped (no
    // anchor), so it falls through to toggle.
    const selection = selectionAfterClick(createSelectionState(), ordered, 'c', { toggle: true, range: true })
    expect(selection).toEqual({ anchor: 'c', ids: new Set([ 'c' ]) })
  })
})

describe('reconcileColumns', () => {
  test('keeps a saved column\'s order, width and visibility', () => {
    const saved: readonly ColumnConfig[] = [
      { key: 'title', width: '1fr', resizable: false, visible: true },
      { key: 'artist', width: '300px', resizable: true, visible: false },
    ]

    const result = reconcileColumns(saved, DEFAULT_COLUMNS)
    expect(result[0]).toEqual(saved[0])
    expect(result[1]).toEqual(saved[1])
  })

  test('appends a default column that saved data does not know about yet', () => {
    const saved: readonly ColumnConfig[] = [{ key: 'title', width: '1fr', resizable: false, visible: true }]
    const result                         = reconcileColumns(saved, DEFAULT_COLUMNS)

    const keys = result.map(c => c.key)
    expect(keys).toContain('rating')
    expect(keys.indexOf('title')).toBeLessThan(keys.indexOf('rating'))
  })

  test('drops a saved column the defaults no longer know about', () => {
    const saved: readonly ColumnConfig[] = [
      { key: 'title', width: '1fr', resizable: false, visible: true },
      { key: 'legacy' as ColumnConfig['key'], width: '10px', resizable: true, visible: true },
    ]

    const result = reconcileColumns(saved, DEFAULT_COLUMNS)
    expect(result.map(c => c.key)).not.toContain('legacy')
  })

  test('with nothing saved, reconciles to exactly the defaults', () => {
    expect(reconcileColumns([], DEFAULT_COLUMNS)).toEqual(DEFAULT_COLUMNS)
  })
})

describe('gridTemplate', () => {
  test('joins the widths of visible columns only, in order', () => {
    const columns: readonly ColumnConfig[] = [
      { key: 'art', width: '36px', resizable: false, visible: true },
      { key: 'year', width: '64px', resizable: true, visible: false },
      { key: 'title', width: '1fr', resizable: false, visible: true },
    ]

    expect(gridTemplate(columns)).toBe('36px 1fr')
  })
})

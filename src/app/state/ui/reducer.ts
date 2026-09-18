/** The ui slice's reducer. Pure — see AGENTS.md L4. */
import type { UiAction } from './actions'
import type { ColumnConfig, ColumnKey } from './columns'
import { DEFAULT_COLUMNS } from './columns'
import { selectionAfterClick } from './selection'
import type { UiScope, UiState } from './state'


function mapColumns (
  columns: readonly ColumnConfig[],
  key: ColumnKey,
  patch: Partial<ColumnConfig>
): readonly ColumnConfig[] {
  return columns.map(column =>
    column.key === key ? { ...column, ...patch } : column)
}

function reorderColumns (
  columns: readonly ColumnConfig[],
  key: ColumnKey,
  beforeKey: ColumnKey | null
): readonly ColumnConfig[] {
  const moving = columns.find(column =>
    column.key === key)
  if (!moving)
    return columns

  const rest = columns.filter(column =>
    column.key !== key)

  if (beforeKey === null)
    return [ ...rest, moving ]

  const index = rest.findIndex(column =>
    column.key === beforeKey)

  return index === -1
    ? [ ...rest, moving ]
    : [ ...rest.slice(0, index), moving, ...rest.slice(index) ]
}

export function uiReducer (state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case 'ui/viewChanged':
      return { ...state, view: action.view }
    case 'ui/overlayOpened':
      return { ...state, overlay: action.overlay }
    case 'ui/overlayClosed':
      return { ...state, overlay: null }
    case 'ui/playerModeSet':
      return { ...state, playerMode: action.mode }
    case 'ui/lyricsToggled':
      return { ...state, lyricsOpen: !state.lyricsOpen }
    case 'ui/sidebarToggled':
      return { ...state, sidebarOpen: !state.sidebarOpen }
    case 'ui/folderSelected':
      return { ...state, scope: { folder: action.path, playlist: null, list: null, group: null }}
    case 'ui/playlistSelected':
      return { ...state, scope: { folder: null, playlist: action.id, list: null, group: null }}
    case 'ui/listSelected':
      return { ...state, scope: { folder: null, playlist: null, list: action.list, group: null }}
    case 'ui/groupSelected': {
      const scope: UiScope = {
        folder:   state.scope.folder,
        playlist: null,
        list:     null,
        group:    { grouping: action.grouping, key: action.key, label: action.label },
      }
      return { ...state, scope }
    }
    case 'ui/densitySet':
      return { ...state, density: action.density }
    case 'ui/groupingSet':
      return { ...state, grouping: action.grouping }
    case 'ui/sortSet':
      return { ...state, sort: { key: action.key, dir: action.dir }}
    case 'ui/columnToggled': {
      const column = state.columns.find(c =>
        c.key === action.key)
      return column
        ? { ...state, columns: mapColumns(state.columns, action.key, { visible: !column.visible }) }
        : state
    }

    case 'ui/columnResized': {
      const column = state.columns.find(c =>
        c.key === action.key)
      return column?.resizable
        ? { ...state, columns: mapColumns(state.columns, action.key, { width: action.width }) }
        : state
    }
    case 'ui/columnReordered':
      return { ...state, columns: reorderColumns(state.columns, action.key, action.beforeKey) }
    case 'ui/columnReset':
      return { ...state, columns: DEFAULT_COLUMNS }
    case 'ui/rowClicked':
      return {
        ...state,
        selection: selectionAfterClick(state.selection, action.orderedIds, action.id, {
          toggle: action.toggle,
          range:  action.range,
        }),
      }
    case 'ui/selectionCleared':
      return { ...state, selection: { anchor: null, ids: new Set() }}
    case 'ui/tagEditorOpened':
      return { ...state, editingTrackId: action.id, overlay: 'tag-editor' }
    case 'ui/tagEditorClosed':
      return {
        ...state,
        editingTrackId: null,
        overlay:        state.overlay === 'tag-editor' ? null : state.overlay,
      }
    case 'ui/contextMenuRequested':
      return {
        ...state,
        contextMenu: { menuId: action.menuId, items: action.items, x: action.x, y: action.y },
      }
    case 'ui/contextMenuClosed':
      return { ...state, contextMenu: null }
    default:
      return state
  }
}

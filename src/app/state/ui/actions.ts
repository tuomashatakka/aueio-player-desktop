import type { MenuItemJSON } from '../../../shared/dto'
import type { Grouping } from '../../domain'
import type { SortDir, SortKey } from '../library/selectors'
import type { ColumnKey } from './columns'
import type { Density, Overlay, PlayerMode, UiGrouping, UiView } from './state'


export interface UiViewChanged {
  readonly type: 'ui/viewChanged'
  readonly view: UiView
}

export interface UiOverlayOpened {
  readonly type:    'ui/overlayOpened'
  readonly overlay: Exclude<Overlay, null>
}

export interface UiOverlayClosed {
  readonly type: 'ui/overlayClosed'
}

export interface UiPlayerModeSet {
  readonly type: 'ui/playerModeSet'
  readonly mode: PlayerMode
}

export interface UiLyricsToggled {
  readonly type: 'ui/lyricsToggled'
}

export interface UiSidebarToggled {
  readonly type: 'ui/sidebarToggled'
}

export interface UiFolderSelected {
  readonly type: 'ui/folderSelected'
  readonly path: string
}

export interface UiPlaylistSelected {
  readonly type: 'ui/playlistSelected'
  readonly id:   string
}

export interface UiListSelected {
  readonly type: 'ui/listSelected'
  readonly list: 'queue' | 'history'
}

export interface UiGroupSelected {
  readonly type:     'ui/groupSelected'
  readonly grouping: Grouping
  readonly key:      string
  readonly label:    string
}

export interface UiDensitySet {
  readonly type:    'ui/densitySet'
  readonly density: Density
}

export interface UiGroupingSet {
  readonly type:     'ui/groupingSet'
  readonly grouping: UiGrouping
}

export interface UiSortSet {
  readonly type: 'ui/sortSet'
  readonly key:  SortKey
  readonly dir:  SortDir
}

export interface UiColumnToggled {
  readonly type: 'ui/columnToggled'
  readonly key:  ColumnKey
}

export interface UiColumnResized {
  readonly type:  'ui/columnResized'
  readonly key:   ColumnKey
  readonly width: string
}

export interface UiColumnReordered {
  readonly type:      'ui/columnReordered'
  readonly key:       ColumnKey
  readonly beforeKey: ColumnKey | null
}

export interface UiColumnReset {
  readonly type: 'ui/columnReset'
}

export interface UiRowClicked {
  readonly type:       'ui/rowClicked'
  readonly id:         string
  readonly orderedIds: readonly string[]
  readonly toggle:     boolean
  readonly range:      boolean
}

export interface UiSelectionCleared {
  readonly type: 'ui/selectionCleared'
}

export interface UiTagEditorOpened {
  readonly type: 'ui/tagEditorOpened'
  readonly id:   string
}

export interface UiTagEditorClosed {
  readonly type: 'ui/tagEditorClosed'
}

export interface UiContextMenuRequested {
  readonly type:   'ui/contextMenuRequested'
  readonly menuId: string
  readonly items:  readonly MenuItemJSON[]
  readonly x:      number
  readonly y:      number
}

export interface UiContextMenuClosed {
  readonly type: 'ui/contextMenuClosed'
}

export type UiAction =
  | UiViewChanged |
  UiOverlayOpened |
  UiOverlayClosed |
  UiPlayerModeSet |
  UiLyricsToggled |
  UiSidebarToggled |
  UiFolderSelected |
  UiPlaylistSelected |
  UiListSelected |
  UiGroupSelected |
  UiDensitySet |
  UiGroupingSet |
  UiSortSet |
  UiColumnToggled |
  UiColumnResized |
  UiColumnReordered |
  UiColumnReset |
  UiRowClicked |
  UiSelectionCleared |
  UiTagEditorOpened |
  UiTagEditorClosed |
  UiContextMenuRequested |
  UiContextMenuClosed

import type { MenuItemJSON } from '../../../shared/dto'
import type { Grouping } from '../../domain'
import type { SortDir, SortKey } from '../library/selectors'
import { DEFAULT_COLUMNS } from './columns'
import type { ColumnConfig } from './columns'
import { createSelectionState } from './selection'
import type { SelectionState } from './selection'


export type UiView = 'library' | 'settings'
export type Overlay = 'player' | 'dsp' | 'tag-editor' | null
export type PlayerMode = 'default' | 'analysis'
export type Density = 'compact' | 'normal' | 'relaxed' | 'grid-sm' | 'grid-lg'

/** The grouping the table renders under, `'none'` included for the flat view. */
export type UiGrouping = Grouping | 'none'

export interface ScopeGroup {
  readonly grouping: Grouping
  readonly key:      string
  readonly label:    string
}

/**
 * Where the library view is browsing. Exactly one of the four is set at a
 * time — see the "Scope semantics" rule in AGENTS.md L4: selecting a folder,
 * a playlist or a list clears all four; selecting a group keeps the folder.
 */
export interface UiScope {
  readonly folder:   string | null
  readonly playlist: string | null
  readonly list:     'queue' | 'history' | null
  readonly group:    ScopeGroup | null
}

export interface SortState {
  readonly key: SortKey
  readonly dir: SortDir
}

export interface ContextMenuState {
  readonly menuId: string
  readonly items:  readonly MenuItemJSON[]
  readonly x:      number
  readonly y:      number
}

export interface UiState {
  readonly view:           UiView
  readonly overlay:        Overlay
  readonly playerMode:     PlayerMode
  readonly lyricsOpen:     boolean
  readonly sidebarOpen:    boolean
  readonly scope:          UiScope
  readonly density:        Density
  readonly grouping:       UiGrouping
  readonly sort:           SortState
  readonly columns:        readonly ColumnConfig[]
  readonly selection:      SelectionState
  readonly editingTrackId: string | null
  readonly contextMenu:    ContextMenuState | null
}

function createScope (): UiScope {
  return { folder: null, playlist: null, list: null, group: null }
}

export function createUiState (): UiState {
  return {
    view:           'library',
    overlay:        null,
    playerMode:     'default',
    lyricsOpen:     false,
    sidebarOpen:    true,
    scope:          createScope(),
    density:        'normal',
    grouping:       'none',
    sort:           { key: 'title', dir: 'asc' },
    columns:        DEFAULT_COLUMNS,
    selection:      createSelectionState(),
    editingTrackId: null,
    contextMenu:    null,
  }
}

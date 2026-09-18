import type { SelectionState } from './selection'
import type { ColumnConfig } from './columns'
import { gridTemplate } from './columns'
import type { UiScope, UiState } from './state'


export function selectColumns (state: UiState): readonly ColumnConfig[] {
  return state.columns
}

export function selectGridTemplate (state: UiState): string {
  return gridTemplate(state.columns)
}

export function selectScope (state: UiState): UiScope {
  return state.scope
}

export function selectSelection (state: UiState): SelectionState {
  return state.selection
}

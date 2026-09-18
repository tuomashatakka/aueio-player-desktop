/** The settings slice's reducer. Pure — see AGENTS.md L4. */
import { Settings } from '../../domain'
import type { SettingsAction } from './actions'
import type { SettingsState } from './state'


export function settingsReducer (state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'settings/loaded':
      return { settings: Settings.fromJSON(action.json), ready: true }
    case 'settings/changed':
      return { ...state, settings: state.settings.with(action.patch) }
    default:
      return state
  }
}

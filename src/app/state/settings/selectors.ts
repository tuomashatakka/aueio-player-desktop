import type { Settings } from '../../domain'
import type { SettingsState } from './state'


export function selectSettings (state: SettingsState): Settings {
  return state.settings
}

export function selectReady (state: SettingsState): boolean {
  return state.ready
}

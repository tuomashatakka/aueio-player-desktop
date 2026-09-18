import { Settings } from '../../domain'


export interface SettingsState {
  readonly settings: Settings
  readonly ready:    boolean
}

export function createSettingsState (): SettingsState {
  return { settings: Settings.defaults(), ready: false }
}

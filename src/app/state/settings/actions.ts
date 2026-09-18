import type { SettingsJSON } from '../../../shared/dto'


export interface SettingsLoaded {
  readonly type: 'settings/loaded'
  readonly json: SettingsJSON
}

export interface SettingsChanged {
  readonly type:  'settings/changed'
  readonly patch: Partial<SettingsJSON>
}

export type SettingsAction = SettingsLoaded | SettingsChanged

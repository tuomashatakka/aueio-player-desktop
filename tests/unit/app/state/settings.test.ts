import { describe, expect, test } from 'bun:test'
import { DEFAULT_SETTINGS } from '../../../../src/shared/settings'
import type { SettingsAction } from '../../../../src/app/state/settings/actions'
import { settingsReducer } from '../../../../src/app/state/settings/reducer'
import { selectReady, selectSettings } from '../../../../src/app/state/settings/selectors'
import { createSettingsState } from '../../../../src/app/state/settings/state'
import type { SettingsState } from '../../../../src/app/state/settings/state'


describe('settingsReducer', () => {
  const initial = createSettingsState()

  const cases: ReadonlyArray<{ name: string, state: SettingsState, action: SettingsAction, expect: (state: SettingsState) => void }> = [
    {
      name:   'loaded replaces settings and flips ready',
      state:  initial,
      action: { type: 'settings/loaded', json: { ...DEFAULT_SETTINGS, volume: 0.2 }},
      expect: state => {
        expect(state.ready).toBe(true)
        expect(state.settings.volume).toBe(0.2)
      },
    },
    {
      name:   'changed patches settings in place, keeping ready as-is',
      state:  { settings: initial.settings, ready: true },
      action: { type: 'settings/changed', patch: { theme: 'light' }},
      expect: state => {
        expect(state.ready).toBe(true)
        expect(state.settings.theme).toBe('light')
      },
    },
    {
      name:   'changed normalizes garbage in the patch',
      state:  initial,
      action: { type: 'settings/changed', patch: { volume: 99 as unknown as number }},
      expect: state => {
        expect(state.settings.volume).toBe(1)
      },
    },
    {
      name:   'an unknown action type is a no-op',
      state:  initial,
      action: { type: 'settings/nonsense' } as unknown as SettingsAction,
      expect: state => {
        expect(state).toBe(initial)
      },
    },
  ]

  for (const { name, state, action, expect: assert } of cases)
    test(name, () => {
      assert(settingsReducer(state, action))
    })
})

describe('settings selectors', () => {
  test('selectSettings/selectReady read straight through', () => {
    const state = createSettingsState()
    expect(selectSettings(state)).toBe(state.settings)
    expect(selectReady(state)).toBe(false)
  })
})

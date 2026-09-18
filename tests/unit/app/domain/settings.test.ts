import { describe, expect, test } from 'bun:test'
import { Settings } from '../../../../src/app/domain'
import { DEFAULT_SETTINGS } from '../../../../src/shared/settings'


describe('Settings', () => {
  test('round-trips through fromJSON/toJSON', () => {
    expect(Settings.fromJSON(DEFAULT_SETTINGS).toJSON()).toEqual(DEFAULT_SETTINGS)
  })

  test('defaults() matches fromJSON(DEFAULT_SETTINGS)', () => {
    expect(Settings.defaults().toJSON()).toEqual(DEFAULT_SETTINGS)
  })

  test('normalizes garbage input', () => {
    expect(Settings.fromJSON(null).toJSON()).toEqual(DEFAULT_SETTINGS)
    expect(Settings.fromJSON({ volume: 99, theme: 'nonsense' }).volume).toBe(1)
  })

  test('is frozen', () => {
    expect(Object.isFrozen(Settings.defaults())).toBe(true)
  })

  test('`with` returns a distinct, still-frozen instance and never mutates the original', () => {
    const original = Settings.defaults()
    const patched  = original.with({ volume: 0.3 })

    expect(patched).not.toBe(original)
    expect(patched.volume).toBe(0.3)
    expect(original.volume).toBe(DEFAULT_SETTINGS.volume)
    expect(Object.isFrozen(patched)).toBe(true)
  })
})

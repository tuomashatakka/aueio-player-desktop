import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { loadSettings, saveSettings } from '../../../../src/main/settings/store'
import { DEFAULT_SETTINGS } from '../../../../src/shared/settings'


describe('settings/store', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'aueio-settings-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  test('a missing file yields defaults', async () => {
    expect(await loadSettings(dir)).toEqual(DEFAULT_SETTINGS)
  })

  test('round-trips a saved settings object', async () => {
    const settings = { ...DEFAULT_SETTINGS, volume: 0.42, roots: [ '/music' ]}
    await saveSettings(dir, settings)

    expect(await loadSettings(dir)).toEqual(settings)
  })

  test('creates the directory if it does not exist yet', async () => {
    const nested = path.join(dir, 'nested', 'deeper')
    await saveSettings(nested, DEFAULT_SETTINGS)

    expect(await loadSettings(nested)).toEqual(DEFAULT_SETTINGS)
  })

  test('garbage on disk falls back to defaults', async () => {
    await writeFile(path.join(dir, 'settings.json'), 'not json at all {{{')

    expect(await loadSettings(dir)).toEqual(DEFAULT_SETTINGS)
  })

  test('a JSON value that is not an object falls back to defaults', async () => {
    await writeFile(path.join(dir, 'settings.json'), '42')

    expect(await loadSettings(dir)).toEqual(DEFAULT_SETTINGS)
  })
})

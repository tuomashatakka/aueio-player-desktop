/**
 * `settings.json` under `PATHS.userData`. The pure normaliser lives in
 * `shared/settings.ts` (main must never import `src/app/**`), so this module
 * is only responsible for reading and writing the file — see
 * docs/plans/desktop-audio-migration.md §6 and L2.
 */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { SettingsJSON } from '../../shared/dto'
import { normalizeSettings } from '../../shared/settings'


const SETTINGS_FILE_NAME = 'settings.json'

/** Reads and normalizes `settings.json`; a missing or corrupt file yields defaults. */
export async function loadSettings (dir: string): Promise<SettingsJSON> {
  const file = Bun.file(path.join(dir, SETTINGS_FILE_NAME))

  if (!await file.exists())
    return normalizeSettings(undefined)

  try {
    return normalizeSettings(await file.json())
  }
  catch {
    return normalizeSettings(undefined)
  }
}

/** Normalizes then writes `settings.json`, creating `dir` if it doesn't exist. */
export async function saveSettings (dir: string, json: SettingsJSON): Promise<void> {
  await mkdir(dir, { recursive: true })
  await Bun.write(path.join(dir, SETTINGS_FILE_NAME), JSON.stringify(normalizeSettings(json), null, 2))
}

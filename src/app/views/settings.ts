import type { PlayerState } from '../state/types'
import type { Store } from '../state/index'
import type { RPCClient } from '../rpc/index'
import { ActionType } from '../state/actions'
import { buildFolderItem } from '../components/folderItem'
import { triggerScan } from './library'
import { $ } from '../utils/dom'


// ─── DOM refs ─────────────────────────────────────────────────

const elFolderList = $('folder-list')
const elAddFolderBtn = $('add-folder-btn')
const elSettingsVolume = $<HTMLInputElement>('settings-volume')
const elNpVolume = $<HTMLInputElement>('np-volume')

// ─── Render ───────────────────────────────────────────────────

export const renderSettings = (state: PlayerState): void => {
  const { folders } = state.settings

  elFolderList.innerHTML = ''

  if (folders.length === 0) {
    const empty = document.createElement('p')
    empty.style.cssText = 'color:var(--text-muted);font-size:var(--text-sm)'
    empty.textContent = 'No folders added yet'
    elFolderList.append(empty)
    return
  }

  for (const [idx, folder] of folders.entries())
    elFolderList.append(buildFolderItem(folder, idx, _onRemoveFolder))
}

// Needs to be set up by bindSettingsEvents
// eslint-disable-next-line functional/no-let
let _onRemoveFolder: (idx: number) => void = () => { /* no-op until bound */ }

// ─── Side effects ─────────────────────────────────────────────

const removeFolder = async (
  idx: number,
  store: Store,
  rpc: RPCClient
): Promise<void> => {
  const { settings } = store.getState()
  const updated = {
    ...settings,
    folders: settings.folders.filter((_, i) => i !== idx),
  }

  await rpc.request.saveSettings(updated)
  store.dispatch({ type: ActionType.SETTINGS_UPDATED, payload: updated })
  await triggerScan(store, rpc)
}

const addFolder = async (store: Store, rpc: RPCClient): Promise<void> => {
  const picked = await rpc.request.pickFolder()

  if (!picked)
    return

  const { settings } = store.getState()

  if (settings.folders.includes(picked))
    return

  const updated = {
    ...settings,
    folders: [ ...settings.folders, picked ],
  }

  await rpc.request.saveSettings(updated)
  store.dispatch({ type: ActionType.SETTINGS_UPDATED, payload: updated })
  await triggerScan(store, rpc)
}

// ─── Event binding ────────────────────────────────────────────

export const bindSettingsEvents = (store: Store, rpc: RPCClient): void => {
  // Wire up the remove folder handler used by folderItem components
  _onRemoveFolder = (idx: number) => {
    removeFolder(idx, store, rpc).catch(console.error)
  }

  elAddFolderBtn.addEventListener('click', () => {
    addFolder(store, rpc).catch(console.error)
  })

  // Volume (synced between settings and now-playing)
  elSettingsVolume.addEventListener('input', () => {
    const vol = Number.parseFloat(elSettingsVolume.value)
    store.dispatch({ type: ActionType.VOLUME_CHANGED, payload: vol })
  })

  store.subscribe(state => {
    renderSettings(state)

    // Sync volume slider value
    elSettingsVolume.value = String(state.volume)
    elNpVolume.value = String(state.volume)
  })
}

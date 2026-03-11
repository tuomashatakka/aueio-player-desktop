import type { PlayerState, ThemeName } from '../state/types'
import type { Store } from '../state/index'
import type { RPCClient } from '../rpc/index'
import type { AudioEngine } from '../audio/AudioEngine'
import { ActionType } from '../state/actions'
import { FolderItem } from './FolderItem'


type Props = {
  state: PlayerState
  dispatch: Store['dispatch']
  rpc: RPCClient
  engine: AudioEngine
  onTriggerScan: () => Promise<void>
}

export const SettingsView = ({ state, dispatch, rpc, engine, onTriggerScan }: Props) => {
  const isActive = state.activeView === 'settings'

  const removeFolder = async (idx: number) => {
    const updated = {
      ...state.settings,
      folders: state.settings.folders.filter((_, i) => i !== idx),
    }
    await rpc.request.saveSettings(updated)
    dispatch({ type: ActionType.SETTINGS_UPDATED, payload: updated })
    await onTriggerScan()
  }

  const addFolder = async () => {
    const picked = await rpc.request.pickFolder()
    if (!picked) return
    if (state.settings.folders.includes(picked)) return

    const updated = { ...state.settings, folders: [...state.settings.folders, picked] }
    await rpc.request.saveSettings(updated)
    dispatch({ type: ActionType.SETTINGS_UPDATED, payload: updated })
    await onTriggerScan()
  }

  return (
    <section id="settings-view" data-view="settings" className={isActive ? 'active' : ''}>
      <div id="settings-content">

        <div className="settings-section">
          <h2 className="settings-section-title">Music Library Folders</h2>

          <div id="folder-list" data-stack="sm">
            {state.settings.folders.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                No folders added yet
              </p>
            ) : (
              state.settings.folders.map((folder, idx) => (
                <FolderItem
                  key={folder}
                  folder={folder}
                  index={idx}
                  onRemove={(i) => removeFolder(i).catch(console.error)}
                />
              ))
            )}
          </div>

          <button
            id="add-folder-btn"
            data-variant="primary"
            data-size="sm"
            onClick={() => addFolder().catch(console.error)}
          >
            + Add Folder
          </button>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">Playback</h2>
          <div className="settings-row">
            <label htmlFor="settings-volume">Default Volume</label>
            <input
              id="settings-volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={state.volume}
              aria-label="Default volume"
              onChange={(e) => {
                const vol = Number.parseFloat(e.target.value)
                engine.setVolume(vol)
                dispatch({ type: ActionType.VOLUME_CHANGED, payload: vol })
              }}
            />
          </div>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">Appearance</h2>
          <div className="settings-row">
            <label htmlFor="settings-theme">Theme</label>
            <select
              id="settings-theme"
              aria-label="Select theme"
              value={state.theme}
              onChange={(e) => {
                const theme = e.target.value as ThemeName
                dispatch({ type: ActionType.THEME_CHANGED, payload: theme })
                rpc.request.saveSettings({ ...state.settings, theme }).catch(console.error)
              }}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="solarized">Solarized</option>
              <option value="nord">Nord</option>
            </select>
          </div>
        </div>

      </div>
    </section>
  )
}

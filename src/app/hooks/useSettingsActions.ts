import { useCallback } from 'react'
import { useStore, useRPC, useEngine } from '../context'
import type { ThemeName } from '../state/types'
import { ActionType } from '../state/actions'
import { useSelector } from './useSelector'
import { selectSettings } from '../selectors/index'


export const useSettingsActions = (onTriggerScan: () => Promise<void>) => {
  const store  = useStore()
  const rpc    = useRPC()
  const engine = useEngine()

  const settings = useSelector(selectSettings)

  const addFolder = useCallback(async () => {
    const picked = await rpc.request.pickFolder()
    if (!picked)
      return
    if (settings.folders.includes(picked))
      return

    const updated = { ...settings, folders: [ ...settings.folders, picked ]}
    await rpc.request.saveSettings(updated)
    store.dispatch({ type: ActionType.SETTINGS_UPDATED, payload: updated })
    await onTriggerScan()
  }, [ settings, rpc, store, onTriggerScan ])

  const removeFolder = useCallback(async (idx: number) => {
    const updated = {
      ...settings,
      folders: settings.folders.filter((_, i) =>
        i !== idx),
    }
    await rpc.request.saveSettings(updated)
    store.dispatch({ type: ActionType.SETTINGS_UPDATED, payload: updated })
    await onTriggerScan()
  }, [ settings, rpc, store, onTriggerScan ])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number.parseFloat(e.target.value)
    engine.setVolume(vol)
    store.dispatch({ type: ActionType.VOLUME_CHANGED, payload: vol })
  }, [ engine, store ])

  const handleThemeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const theme = e.target.value as ThemeName
    store.dispatch({ type: ActionType.THEME_CHANGED, payload: theme })
    rpc.request.saveSettings({ ...settings, theme }).catch(console.error)
  }, [ settings, store, rpc ])

  return { addFolder, removeFolder, handleVolumeChange, handleThemeChange }
}

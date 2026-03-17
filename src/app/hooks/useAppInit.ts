import { useEffect, useRef } from 'react'
import { useStore, useRPC, useEngine } from '../context'
import type { Track, ThemeName } from '../state/types'
import { ActionType } from '../state/actions'
import { navigate, getCurrentViewFromURL, bindPopState } from '../navigation/index'


/**
 * Handles all one-time app initialization:
 * - popstate binding
 * - mock library injection (Playwright tests)
 * - async init (fetch port, settings, scan library)
 */
export const useAppInit = (triggerScan: () => Promise<void>): void => {
  const store  = useStore()
  const rpc    = useRPC()
  const engine = useEngine()

  const storeRef = useRef(store)
  // eslint-disable-next-line functional/immutable-data
  storeRef.current = store

  const engineRef = useRef(engine)
  // eslint-disable-next-line functional/immutable-data
  engineRef.current = engine

  // ── History / popstate ────────────────────────────────────────
  useEffect(() =>
    bindPopState(storeRef.current.dispatch), [])

  // ── Mock library injection (Playwright tests) ─────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const tracks = (e as CustomEvent).detail as readonly Track[]
      storeRef.current.dispatch({ type: ActionType.TRACKS_LOADED, payload: tracks })
    }
    document.addEventListener('__mock_library_updated', handler)
    return () => {
      document.removeEventListener('__mock_library_updated', handler)
    }
  }, [])

  // ── Async init ────────────────────────────────────────────────
  useEffect(() => {
    const view = getCurrentViewFromURL()
    navigate(view, true)
    storeRef.current.dispatch({ type: ActionType.VIEW_CHANGED, payload: view })

    const init = async () => {
      try {
        const [ port, settings ] = await Promise.all([
          rpc.request.getAudioPort(),
          rpc.request.getSettings(),
        ])

        storeRef.current.dispatch({ type: ActionType.AUDIO_PORT_SET, payload: port })
        storeRef.current.dispatch({ type: ActionType.SETTINGS_UPDATED, payload: settings })

        if (settings.theme) {
          storeRef.current.dispatch({ type: ActionType.THEME_CHANGED, payload: settings.theme as ThemeName })
          // eslint-disable-next-line functional/immutable-data
          document.documentElement.dataset.theme = settings.theme
        }

        const volume = settings.volume ?? 1
        storeRef.current.dispatch({ type: ActionType.VOLUME_CHANGED, payload: volume })
        engineRef.current.setVolume(volume)

        if (settings.folders.length > 0) {
          storeRef.current.dispatch({ type: ActionType.LIBRARY_LOADING })

          const tracks = await rpc.request.scanLibrary({ folders: settings.folders })
          storeRef.current.dispatch({ type: ActionType.TRACKS_LOADED, payload: tracks })
        }
        else {
          storeRef.current.dispatch({ type: ActionType.TRACKS_LOADED, payload: []})
        }
      }
      catch (err) {
        console.error('[aueio] init error:', err)
        storeRef.current.dispatch({ type: ActionType.TRACKS_LOADED, payload: []})
      }
    }

    init().catch(console.error)
  }, [ rpc ])
}

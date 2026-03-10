import { createStore, initialState, ActionType } from './state/index'
import { initRPC } from './rpc/index'
import { AudioEngine } from './audio/AudioEngine'
import { bindLibraryEvents, renderLibrary, triggerScan } from './views/library'
import { bindSettingsEvents, renderSettings } from './views/settings'
import { bindNowPlayingEvents, renderNowPlaying } from './views/nowPlaying'
import { bindPopState, navigate, getCurrentViewFromURL } from './navigation/index'
import type { ThemeName } from './state/types'

// ─── Register all web components ──────────────────────────────
import './ui/index'

// ─── Bootstrap ────────────────────────────────────────────────

const store = createStore(initialState)
const rpc = initRPC(store)
const engine = AudioEngine.getInstance()

// Bind all event handlers (called once at startup)
bindLibraryEvents(store, rpc, engine)
bindSettingsEvents(store, rpc)
bindNowPlayingEvents(store, engine)
bindPopState(store.dispatch)

// Initial render from default state
renderLibrary(initialState, store.dispatch)
renderSettings(initialState)
renderNowPlaying(initialState)

// ─── Init (async) ─────────────────────────────────────────────

const init = async (): Promise<void> => {
  // Restore view from URL hash
  const view = getCurrentViewFromURL()
  navigate(view, true)
  store.dispatch({ type: ActionType.VIEW_CHANGED, payload: view })

  try {
    const [port, settings] = await Promise.all([
      rpc.request.getAudioPort(),
      rpc.request.getSettings(),
    ])

    store.dispatch({ type: ActionType.AUDIO_PORT_SET, payload: port })
    store.dispatch({ type: ActionType.SETTINGS_UPDATED, payload: settings })

    // Restore saved theme
    if (settings.theme) {
      store.dispatch({ type: ActionType.THEME_CHANGED, payload: settings.theme as ThemeName })
      document.documentElement.dataset['theme'] = settings.theme
    }

    const volume = settings.volume ?? 1
    store.dispatch({ type: ActionType.VOLUME_CHANGED, payload: volume })
    engine.setVolume(volume)

    if (settings.folders.length > 0)
      await triggerScan(store, rpc)
    else
      store.dispatch({ type: ActionType.TRACKS_LOADED, payload: [] })
  } catch (err) {
    console.error('[aueio] init error:', err)
    store.dispatch({ type: ActionType.TRACKS_LOADED, payload: [] })
  }
}

init().catch(console.error)

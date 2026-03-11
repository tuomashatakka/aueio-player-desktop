import { useSyncExternalStore, useEffect, useCallback } from 'react'
import type { Store } from '../state/index'
import type { RPCClient } from '../rpc/index'
import type { AudioEngine } from '../audio/AudioEngine'
import type { Track, ThemeName } from '../state/types'
import { ActionType } from '../state/actions'
import { StoreContext, RPCContext, EngineContext } from '../context'
import { Topbar } from './Topbar'
import { LibraryView } from './LibraryView'
import { SettingsView } from './SettingsView'
import { NowPlayingView } from './NowPlayingView'
import { NowPlayingBar } from './NowPlayingBar'
import { TagDialog } from './TagDialog'
import { navigate, getCurrentViewFromURL, bindPopState } from '../navigation/index'
import { buildAudioUrl } from '../utils/audio'
import { loadWaveformData } from '../audio/waveform'


type Props = {
  store: Store
  rpc: RPCClient
  engine: AudioEngine
}

export const App = ({ store, rpc, engine }: Props) => {
  const state = useSyncExternalStore(store.subscribe, store.getState)
  const { dispatch } = store

  // ── Derived ──────────────────────────────────────────────────

  const currentTrack = state.currentTrackIndex >= 0
    ? state.filteredTracks[state.currentTrackIndex] ?? null
    : null

  // ── Playback helpers ─────────────────────────────────────────

  const playCurrentTrack = useCallback(async () => {
    const { filteredTracks, currentTrackIndex, audioPort } = store.getState()
    const track = filteredTracks[currentTrackIndex]
    if (!track) return

    const url = buildAudioUrl(track.path, audioPort)
    try {
      await engine.play(url)
      dispatch({ type: ActionType.PLAYBACK_STARTED })
    } catch {
      dispatch({ type: ActionType.PLAYBACK_PAUSED })
      return
    }

    const ctx = engine.audioContext
    if (!ctx || !audioPort) return

    try {
      const waveform = await loadWaveformData(url, ctx)
      dispatch({ type: ActionType.WAVEFORM_LOADED, payload: waveform })
    } catch {
      dispatch({ type: ActionType.WAVEFORM_LOADED, payload: new Float32Array(200).fill(0.3) })
    }
  }, [store, engine, dispatch])

  const playNext = useCallback(() => {
    const { filteredTracks, currentTrackIndex } = store.getState()
    if (!filteredTracks.length) return
    const next = (currentTrackIndex + 1) % filteredTracks.length
    dispatch({ type: ActionType.TRACK_SELECTED, payload: next })
    playCurrentTrack().catch(console.error)
  }, [store, dispatch, playCurrentTrack])

  const playPrev = useCallback(() => {
    const { filteredTracks, currentTrackIndex } = store.getState()
    if (!filteredTracks.length) return

    if (engine.currentTime > 3) {
      engine.seek(0)
      dispatch({ type: ActionType.TIME_UPDATED, payload: { currentTime: 0, duration: engine.duration } })
      return
    }

    const prev = (currentTrackIndex - 1 + filteredTracks.length) % filteredTracks.length
    dispatch({ type: ActionType.TRACK_SELECTED, payload: prev })
    playCurrentTrack().catch(console.error)
  }, [store, engine, dispatch, playCurrentTrack])

  const togglePlayPause = useCallback(() => {
    const { isPlaying, currentTrackIndex, filteredTracks } = store.getState()
    if (currentTrackIndex < 0 || !filteredTracks.length) return

    if (isPlaying) {
      engine.pause()
      dispatch({ type: ActionType.PLAYBACK_PAUSED })
    } else {
      engine.resume()
        .then(() => dispatch({ type: ActionType.PLAYBACK_STARTED }))
        .catch(() => dispatch({ type: ActionType.PLAYBACK_PAUSED }))
    }
  }, [store, engine, dispatch])

  const selectAndPlayTrack = useCallback(async (idx: number) => {
    const s = store.getState()
    const track = s.filteredTracks[idx]
    if (!track) return

    if (idx === s.currentTrackIndex && s.isPlaying) {
      engine.pause()
      dispatch({ type: ActionType.PLAYBACK_PAUSED })
      return
    }

    dispatch({ type: ActionType.TRACK_SELECTED, payload: idx })
    const url = buildAudioUrl(track.path, s.audioPort)

    try {
      await engine.play(url)
      dispatch({ type: ActionType.PLAYBACK_STARTED })
    } catch {
      dispatch({ type: ActionType.PLAYBACK_PAUSED })
      return
    }

    const ctx = engine.audioContext
    if (!ctx || !s.audioPort) return

    try {
      const waveform = await loadWaveformData(url, ctx)
      dispatch({ type: ActionType.WAVEFORM_LOADED, payload: waveform })
    } catch {
      dispatch({ type: ActionType.WAVEFORM_LOADED, payload: new Float32Array(200).fill(0.3) })
    }
  }, [store, engine, dispatch])

  const triggerScan = useCallback(async () => {
    const { settings } = store.getState()
    if (!settings.folders.length) {
      dispatch({ type: ActionType.TRACKS_LOADED, payload: [] })
      return
    }
    dispatch({ type: ActionType.LIBRARY_LOADING })
    try {
      const tracks = await rpc.request.scanLibrary({ folders: settings.folders })
      dispatch({ type: ActionType.TRACKS_LOADED, payload: tracks })
    } catch {
      dispatch({ type: ActionType.TRACKS_LOADED, payload: [] })
    }
  }, [store, rpc, dispatch])

  // ── AudioEngine event bindings ────────────────────────────────

  useEffect(() => {
    const cleanupTime = engine.onTimeUpdate((currentTime, duration) => {
      dispatch({ type: ActionType.TIME_UPDATED, payload: { currentTime, duration } })
    })
    const cleanupEnded  = engine.onEnded(playNext)
    const cleanupError  = engine.onError(() => dispatch({ type: ActionType.PLAYBACK_PAUSED }))
    const cleanupMeta   = engine.onLoadedMetadata(duration => {
      dispatch({ type: ActionType.DURATION_SET, payload: duration })
    })

    return () => { cleanupTime(); cleanupEnded(); cleanupError(); cleanupMeta() }
  }, [engine, dispatch, playNext])

  // ── History / popstate ────────────────────────────────────────

  useEffect(() => bindPopState(dispatch), [dispatch])

  // ── Theme sync ────────────────────────────────────────────────

  useEffect(() => {
    document.documentElement.dataset['theme'] = state.theme
  }, [state.theme])

  // ── Mock library injection (Playwright tests) ─────────────────

  useEffect(() => {
    const handler = (e: Event) => {
      const tracks = (e as CustomEvent).detail as Track[]
      dispatch({ type: ActionType.TRACKS_LOADED, payload: tracks })
    }
    document.addEventListener('__mock_library_updated', handler)
    return () => { document.removeEventListener('__mock_library_updated', handler) }
  }, [dispatch])

  // ── Async init ────────────────────────────────────────────────

  useEffect(() => {
    const view = getCurrentViewFromURL()
    navigate(view, true)
    dispatch({ type: ActionType.VIEW_CHANGED, payload: view })

    const init = async () => {
      try {
        const [port, settings] = await Promise.all([
          rpc.request.getAudioPort(),
          rpc.request.getSettings(),
        ])

        dispatch({ type: ActionType.AUDIO_PORT_SET, payload: port })
        dispatch({ type: ActionType.SETTINGS_UPDATED, payload: settings })

        if (settings.theme) {
          dispatch({ type: ActionType.THEME_CHANGED, payload: settings.theme as ThemeName })
          document.documentElement.dataset['theme'] = settings.theme
        }

        const volume = settings.volume ?? 1
        dispatch({ type: ActionType.VOLUME_CHANGED, payload: volume })
        engine.setVolume(volume)

        if (settings.folders.length > 0) {
          dispatch({ type: ActionType.LIBRARY_LOADING })
          const tracks = await rpc.request.scanLibrary({ folders: settings.folders })
          dispatch({ type: ActionType.TRACKS_LOADED, payload: tracks })
        } else {
          dispatch({ type: ActionType.TRACKS_LOADED, payload: [] })
        }
      } catch (err) {
        console.error('[aueio] init error:', err)
        dispatch({ type: ActionType.TRACKS_LOADED, payload: [] })
      }
    }

    init().catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount

  // ── Render ────────────────────────────────────────────────────

  return (
    <StoreContext.Provider value={store}>
      <RPCContext.Provider value={rpc}>
        <EngineContext.Provider value={engine}>

          <Topbar
            activeView={state.activeView}
            onNav={(view) => {
              dispatch({ type: ActionType.VIEW_CHANGED, payload: view })
              navigate(view)
            }}
          />

          <main id="views">
            <LibraryView
              state={state}
              dispatch={dispatch}
              onPlayTrack={selectAndPlayTrack}
              onSaveTag={(idx, track, tags) => {
                dispatch({ type: ActionType.TRACK_TAGS_UPDATED, payload: { id: track.id, tags } })
                rpc.request.saveTrackTags({ id: track.id, tags }).catch(console.error)
              }}
              onSaveRating={(idx, track, rating) => {
                dispatch({ type: ActionType.TRACK_TAGS_UPDATED, payload: { id: track.id, tags: { rating } } })
                rpc.request.saveTrackTags({ id: track.id, tags: { rating } }).catch(console.error)
              }}
            />

            <SettingsView
              state={state}
              dispatch={dispatch}
              rpc={rpc}
              engine={engine}
              onTriggerScan={triggerScan}
            />
          </main>

          <NowPlayingView
            state={state}
            dispatch={dispatch}
            engine={engine}
            onPlayNext={playNext}
            onPlayPrev={playPrev}
            onTogglePlayPause={togglePlayPause}
          />

          <NowPlayingBar
            state={state}
            dispatch={dispatch}
            engine={engine}
            currentTrack={currentTrack}
            onPlayNext={playNext}
            onPlayPrev={playPrev}
            onTogglePlayPause={togglePlayPause}
          />

          <TagDialog
            state={state}
            dispatch={dispatch}
            onSave={(idx, tags) => {
              const track = store.getState().filteredTracks[idx]
              if (!track) return
              dispatch({ type: ActionType.TRACK_TAGS_UPDATED, payload: { id: track.id, tags } })
              rpc.request.saveTrackTags({ id: track.id, tags }).catch(console.error)
            }}
          />

        </EngineContext.Provider>
      </RPCContext.Provider>
    </StoreContext.Provider>
  )
}

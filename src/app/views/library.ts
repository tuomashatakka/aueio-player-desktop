import type { PlayerState } from '../state/types'
import type { Store } from '../state/index'
import type { RPCClient } from '../rpc/index'
import type { AudioEngine } from '../audio/AudioEngine'
import { ActionType } from '../state/actions'
import { buildTrackItem } from '../components/trackItem'
import { buildAudioUrl } from '../utils/audio'
import { loadWaveformData } from '../audio/waveform'
import { $ } from '../utils/dom'
import { navigate } from '../navigation/index'


// ─── DOM refs ─────────────────────────────────────────────────

const elTrackList = $('track-list')
const elLoadingOverlay = $('loading-overlay')
const elLibraryEmpty = $('library-empty')
const elTrackCount = $('track-count')
const elSearchInput = $<HTMLInputElement>('search-input')
const elNavLibrary = $('nav-library')
const elNavSettings = $('nav-settings')
const elEmptyGotoSettings = $('empty-goto-settings')
const elLibraryView = $('library-view')
const elSettingsView = $('settings-view')

// ─── Render ───────────────────────────────────────────────────

export const renderLibrary = (state: PlayerState, dispatch: Store['dispatch']): void => {
  // View visibility
  elLibraryView.classList.toggle('active', state.activeView === 'library')
  elSettingsView.classList.toggle('active', state.activeView === 'settings')

  // Nav active state
  elNavLibrary.classList.toggle('active', state.activeView === 'library')
  elNavSettings.classList.toggle('active', state.activeView === 'settings')

  // Loading state
  if (state.isLoading) {
    elLoadingOverlay.removeAttribute('hidden')
    elTrackList.setAttribute('hidden', '')
    elLibraryEmpty.setAttribute('hidden', '')
    return
  }

  elLoadingOverlay.setAttribute('hidden', '')

  const { filteredTracks, currentTrackIndex, isPlaying } = state
  const count = filteredTracks.length

  elTrackCount.textContent = count === 0 ? '' : `${count} track${count === 1 ? '' : 's'}`

  if (count === 0) {
    elTrackList.setAttribute('hidden', '')
    elLibraryEmpty.removeAttribute('hidden')
    return
  }

  elLibraryEmpty.setAttribute('hidden', '')
  elTrackList.removeAttribute('hidden')

  const frag = document.createDocumentFragment()

  for (const [idx, track] of filteredTracks.entries()) {
    const isCurrent = idx === currentTrackIndex
    const itemIsPlaying = isCurrent && isPlaying
    frag.append(buildTrackItem(track, idx, isCurrent, itemIsPlaying, dispatch))
  }

  elTrackList.innerHTML = ''
  elTrackList.append(frag)
}

// ─── Playback side effect (called from event handler, not subscription) ───────

export const selectAndPlayTrack = async (
  idx: number,
  store: Store,
  engine: AudioEngine
): Promise<void> => {
  const state = store.getState()
  const track = state.filteredTracks[idx]

  if (!track)
    return

  // If same track is playing, toggle pause
  if (idx === state.currentTrackIndex && state.isPlaying) {
    engine.pause()
    store.dispatch({ type: ActionType.PLAYBACK_PAUSED })
    return
  }

  store.dispatch({ type: ActionType.TRACK_SELECTED, payload: idx })

  const url = buildAudioUrl(track.path, state.audioPort)

  try {
    await engine.play(url)
    store.dispatch({ type: ActionType.PLAYBACK_STARTED })
  }
  catch {
    store.dispatch({ type: ActionType.PLAYBACK_PAUSED })
    return
  }

  // Load waveform async after playback starts
  const ctx = engine.audioContext

  if (!ctx || !state.audioPort)
    return

  try {
    const waveform = await loadWaveformData(url, ctx)
    store.dispatch({ type: ActionType.WAVEFORM_LOADED, payload: waveform })
  }
  catch {
    store.dispatch({
      type:    ActionType.WAVEFORM_LOADED,
      payload: new Float32Array(200).fill(0.3),
    })
  }
}

// ─── Library scan side effect ─────────────────────────────────

export const triggerScan = async (store: Store, rpc: RPCClient): Promise<void> => {
  const { settings } = store.getState()

  if (!settings.folders.length) {
    store.dispatch({ type: ActionType.TRACKS_LOADED, payload: [] })
    return
  }

  store.dispatch({ type: ActionType.LIBRARY_LOADING })

  try {
    const tracks = await rpc.request.scanLibrary({ folders: settings.folders })
    store.dispatch({ type: ActionType.TRACKS_LOADED, payload: tracks })
  }
  catch {
    store.dispatch({ type: ActionType.TRACKS_LOADED, payload: [] })
  }
}

// ─── Event binding ────────────────────────────────────────────

export const bindLibraryEvents = (
  store: Store,
  rpc: RPCClient,
  engine: AudioEngine
): void => {
  const { dispatch } = store

  // Navigation
  elNavLibrary.addEventListener('click', () => {
    dispatch({ type: ActionType.VIEW_CHANGED, payload: 'library' })
    navigate('library')
  })

  elNavSettings.addEventListener('click', () => {
    dispatch({ type: ActionType.VIEW_CHANGED, payload: 'settings' })
    navigate('settings')
  })

  elEmptyGotoSettings.addEventListener('click', () => {
    dispatch({ type: ActionType.VIEW_CHANGED, payload: 'settings' })
    navigate('settings')
  })

  // Search
  elSearchInput.addEventListener('input', () => {
    dispatch({ type: ActionType.SEARCH_CHANGED, payload: elSearchInput.value })
  })

  // Track list clicks delegated to container
  elTrackList.addEventListener('click', (e: Event) => {
    const target = (e.target as HTMLElement).closest('[data-track-idx]') as HTMLElement | null

    if (!target)
      return

    const idx = Number.parseInt(target.dataset['trackIdx'] ?? '', 10)

    if (!Number.isNaN(idx))
      selectAndPlayTrack(idx, store, engine).catch(console.error)
  })

  elTrackList.addEventListener('keydown', (e: KeyboardEvent) => {
    const target = (e.target as HTMLElement).closest('[data-track-idx]') as HTMLElement | null

    if (!target || (e.key !== 'Enter' && e.key !== ' '))
      return

    e.preventDefault()
    const idx = Number.parseInt(target.dataset['trackIdx'] ?? '', 10)

    if (!Number.isNaN(idx))
      selectAndPlayTrack(idx, store, engine).catch(console.error)
  })

  // Re-scan when settings update (handled in settings view, but also wired here)
  store.subscribe(state => {
    renderLibrary(state, dispatch)
  })
}

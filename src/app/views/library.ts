import type { PlayerState, Track, SortKey, SortDir } from '../state/types'
import type { Store } from '../state/index'
import type { RPCClient } from '../rpc/index'
import type { AudioEngine } from '../audio/AudioEngine'
import type { AueioTrackRow } from '../ui/TrackRow'
import type { AueioSortHeader } from '../ui/SortHeader'
import type { AueioTagDialog } from '../ui/TagDialog'
import type { AueioTreePanel } from '../ui/TreePanel'
import { ActionType } from '../state/actions'
import { buildAudioUrl } from '../utils/audio'
import { loadWaveformData } from '../audio/waveform'
import { $ } from '../utils/dom'
import { navigate } from '../navigation/index'


// ─── DOM refs ─────────────────────────────────────────────────

const elTrackList         = $('track-list')
const elLoadingOverlay    = $('loading-overlay')
const elLibraryEmpty      = $('library-empty')
const elTrackCount        = $('track-count')
const elSearchInput       = $<HTMLInputElement>('search-input')
const elNavLibrary        = $('nav-library')
const elNavSettings       = $('nav-settings')
const elEmptyGotoSettings = $('empty-goto-settings')
const elLibraryView       = $('library-view')
const elSettingsView      = $('settings-view')
const elHeaderRow         = $('library-header-row')

const getTreePanel  = () => document.getElementById('library-tree') as (AueioTreePanel & HTMLElement) | null
const getTagDialog  = () => document.getElementById('library-tag-dialog') as (AueioTagDialog & HTMLElement) | null

// ─── Render ───────────────────────────────────────────────────

export const renderLibrary = (state: PlayerState, dispatch: Store['dispatch']): void => {
  // View / nav active state
  elLibraryView.classList.toggle('active', state.activeView === 'library')
  elSettingsView.classList.toggle('active', state.activeView === 'settings')
  elNavLibrary.classList.toggle('active', state.activeView === 'library')
  elNavSettings.classList.toggle('active', state.activeView === 'settings')

  // Sort header
  const sortHeader = elHeaderRow.querySelector<AueioSortHeader>('aueio-sort-header')
  if (sortHeader) {
    sortHeader.setAttribute('sort-key', state.sortKey)
    sortHeader.setAttribute('sort-dir', state.sortDir)
  }

  // Tree panel
  const treePanel = getTreePanel()
  if (treePanel) {
    treePanel.tracks = state.tracks
    treePanel.groupBy = state.treeGroupBy
    treePanel.selectedNode = state.treeSelectedNode
    treePanel.expanded = state.treeExpanded
  }

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

  // Re-use existing rows keyed by track id
  const existing = new Map<string, AueioTrackRow & HTMLElement>()
  for (const el of elTrackList.querySelectorAll<AueioTrackRow & HTMLElement>('aueio-track-row')) {
    const id = el.dataset['trackId']
    if (id) existing.set(id, el)
  }

  const frag = document.createDocumentFragment()
  for (const [idx, track] of filteredTracks.entries()) {
    const isCurrent = idx === currentTrackIndex
    const itemIsPlaying = isCurrent && isPlaying

    let row = existing.get(track.id)
    if (!row) {
      row = document.createElement('aueio-track-row') as AueioTrackRow & HTMLElement
      row.dataset['trackId'] = track.id
    }

    row.trackData = track
    row.trackIndex = idx
    row.toggleAttribute('current', isCurrent)
    row.toggleAttribute('playing', itemIsPlaying)
    existing.delete(track.id)
    frag.append(row)
  }

  elTrackList.innerHTML = ''
  elTrackList.append(frag)
}

// ─── Playback side effect ──────────────────────────────────────

export const selectAndPlayTrack = async (
  idx: number,
  store: Store,
  engine: AudioEngine
): Promise<void> => {
  const state = store.getState()
  const track = state.filteredTracks[idx]
  if (!track) return

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
  } catch {
    store.dispatch({ type: ActionType.PLAYBACK_PAUSED })
    return
  }

  const ctx = engine.audioContext
  if (!ctx || !state.audioPort) return

  try {
    const waveform = await loadWaveformData(url, ctx)
    store.dispatch({ type: ActionType.WAVEFORM_LOADED, payload: waveform })
  } catch {
    store.dispatch({ type: ActionType.WAVEFORM_LOADED, payload: new Float32Array(200).fill(0.3) })
  }
}

// ─── Library scan ─────────────────────────────────────────────

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
  } catch {
    store.dispatch({ type: ActionType.TRACKS_LOADED, payload: [] })
  }
}

// ─── Event binding ────────────────────────────────────────────

export const bindLibraryEvents = (store: Store, rpc: RPCClient, engine: AudioEngine): void => {
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

  // Sort header
  elHeaderRow.addEventListener('aueio-sort-change', (e: Event) => {
    const { key, dir } = (e as CustomEvent).detail as { key: SortKey; dir: SortDir }
    dispatch({ type: ActionType.SORT_CHANGED, payload: { key, dir } })
  })

  // Track play
  elTrackList.addEventListener('aueio-track-play', (e: Event) => {
    const { idx } = (e as CustomEvent).detail as { idx: number }
    selectAndPlayTrack(idx, store, engine).catch(console.error)
  })

  // Track tag edit (from row or cell click)
  elTrackList.addEventListener('aueio-track-edit', (e: Event) => {
    const { idx, track, focusField } = (e as CustomEvent).detail as {
      idx: number; track: Track; focusField?: string
    }
    dispatch({ type: ActionType.TAG_EDIT_OPENED, payload: idx })
    getTagDialog()?.open(track, idx, focusField)
  })

  // Rating change
  elTrackList.addEventListener('aueio-track-rating', (e: Event) => {
    const { idx, rating } = (e as CustomEvent).detail as { idx: number; rating: number }
    const track = store.getState().filteredTracks[idx]
    if (!track) return
    dispatch({ type: ActionType.TRACK_TAGS_UPDATED, payload: { id: track.id, tags: { rating } } })
    rpc.request.saveTrackTags({ id: track.id, tags: { rating } }).catch(console.error)
  })

  // Tag dialog events (mounted on document to catch bubbles from dialog's element)
  document.addEventListener('aueio-tag-save', (e: Event) => {
    const { idx, tags } = (e as CustomEvent).detail as { idx: number; tags: Partial<Track> }
    const track = store.getState().filteredTracks[idx]
    if (!track) return
    dispatch({ type: ActionType.TRACK_TAGS_UPDATED, payload: { id: track.id, tags } })
    rpc.request.saveTrackTags({ id: track.id, tags }).catch(console.error)
  })

  document.addEventListener('aueio-tag-close', () => {
    dispatch({ type: ActionType.TAG_EDIT_CLOSED })
  })

  // Tree panel events
  document.addEventListener('aueio-tree-toggle', () => {
    dispatch({ type: ActionType.TREE_TOGGLED })
  })
  document.addEventListener('aueio-tree-node-select', (e: Event) => {
    const { key } = (e as CustomEvent).detail as { key: string | null }
    dispatch({ type: ActionType.TREE_NODE_SELECTED, payload: key })
  })
  document.addEventListener('aueio-tree-group-change', (e: Event) => {
    const { groupBy } = (e as CustomEvent).detail
    dispatch({ type: ActionType.TREE_GROUP_CHANGED, payload: groupBy })
  })

  // Reactive render
  store.subscribe(state => {
    renderLibrary(state, dispatch)
  })
}

import type { PlayerState } from '../state/types'
import type { Store } from '../state/index'
import type { AudioEngine } from '../audio/AudioEngine'
import { ActionType } from '../state/actions'
import { drawWaveformToCanvas } from '../audio/waveform'
import { getTrackEmoji } from '../utils/audio'
import { formatTime, $ } from '../utils/dom'
import { navigateNowPlaying } from '../navigation/index'
import { escapeHtml } from '../utils/dom'


// ─── DOM refs ─────────────────────────────────────────────────

const elNowPlayingView = $('now-playing-view')
const elNowPlayingBar  = $('now-playing-bar')

// Bar elements
const elNpBarTitle      = $('np-bar-title')
const elNpBarArtist     = $('np-bar-artist')
const elNpBarAlbumIcon  = $('np-bar-album-icon')
const elNpBarPlayBtn    = $('np-bar-play-btn')
const elNpBarPrevBtn    = $('np-bar-prev-btn')
const elNpBarNextBtn    = $('np-bar-next-btn')
const elNpBarExpand     = $('np-bar-expand')
const elNpBarWaveform   = $<HTMLCanvasElement>('np-bar-waveform')

// Expanded elements
const elNpBg            = $('np-bg')
const elNpBgColor       = $('np-bg-color')
const elNpBackBtn       = $('np-back-btn')
const elNpTitle         = $('np-title')
const elNpArtist        = $('np-artist')
const elNpAlbumArtTitle = $('np-album-art-title')
const elNpAlbumArt      = $('np-album-art')
const elNpWaveformCanvas    = $<HTMLCanvasElement>('np-waveform-canvas')
const elNpCurrentTime   = $('np-current-time')
const elNpDuration      = $('np-duration')
const elNpPlayBtn       = $('np-play-btn')
const elNpPrevBtn       = $('np-prev-btn')
const elNpNextBtn       = $('np-next-btn')
const elNpVolume        = $<HTMLInputElement>('np-volume')
const elNpWaveformContainer = $('np-waveform-container')
const elNpTags          = $('np-tags')

// ─── Render ───────────────────────────────────────────────────

export const renderNowPlaying = (state: PlayerState): void => {
  const track =
    state.currentTrackIndex >= 0
      ? (state.filteredTracks[state.currentTrackIndex] ?? null)
      : null

  const playIcon = state.isPlaying ? '\u23F8' : '\u25B6'

  // Bar visibility
  if (track) {
    elNowPlayingBar.removeAttribute('hidden')
    elNpBarTitle.textContent = track.title
    elNpBarArtist.textContent = track.artist
    elNpBarAlbumIcon.textContent = getTrackEmoji(track)
    const color = track.coverColor ?? 'hsl(220,60%,40%)'
    const albumIconParent = elNpBarAlbumIcon.parentElement as HTMLElement
    albumIconParent.style.background = color
  } else {
    elNowPlayingBar.setAttribute('hidden', '')
  }

  elNpBarPlayBtn.textContent = playIcon
  elNpPlayBtn.textContent = playIcon

  // Expanded view visibility
  elNowPlayingView.classList.toggle('active', state.isNowPlayingExpanded)

  if (!track) return

  // Expanded view content
  elNpTitle.textContent = track.title
  elNpArtist.textContent = track.artist
  elNpAlbumArtTitle.textContent = getTrackEmoji(track)

  const color = track.coverColor ?? 'hsl(220,60%,40%)'
  elNpAlbumArt.style.background = color
  elNpBgColor.style.background = color
  elNpBg.style.background = color
  elNpAlbumArt.classList.toggle('playing', state.isPlaying)

  // Time
  elNpCurrentTime.textContent = formatTime(state.currentTime)
  elNpDuration.textContent = formatTime(state.duration)

  const progress = state.duration > 0 ? state.currentTime / state.duration : 0
  elNpWaveformContainer.setAttribute('aria-valuenow', String(Math.round(progress * 100)))

  // Waveform
  if (state.waveformData) {
    drawWaveformToCanvas(elNpWaveformCanvas, state.waveformData, progress, true)
    drawWaveformToCanvas(elNpBarWaveform, state.waveformData, progress, false)
  }

  elNpVolume.value = String(state.volume)

  // ── Extended tag display ─────────────────────────────────────
  if (elNpTags) {
    const tags: { label: string; value: string | number | undefined }[] = [
      { label: 'Album',    value: track.album },
      { label: 'Artist',   value: track.artist },
      { label: 'Genre',    value: track.genre },
      { label: 'Year',     value: track.year },
      { label: 'Track #',  value: track.trackNumber },
      { label: 'Disk',     value: track.diskNumber },
      { label: 'Comment',  value: track.comment },
      { label: 'Duration', value: track.duration > 0 ? formatTime(track.duration) : undefined },
    ]

    const visible = tags.filter(t => t.value !== undefined && t.value !== '')

    elNpTags.innerHTML = visible.map(t => `
      <span class="np-tag">
        <span class="np-tag-label">${escapeHtml(t.label)}</span>
        <span class="np-tag-value">${escapeHtml(String(t.value))}</span>
      </span>
    `).join('')
  }
}

// ─── Playback side effects ────────────────────────────────────

const playNext = (store: Store, engine: AudioEngine): void => {
  const { filteredTracks, currentTrackIndex } = store.getState()
  if (!filteredTracks.length) return
  const next = (currentTrackIndex + 1) % filteredTracks.length
  store.dispatch({ type: ActionType.TRACK_SELECTED, payload: next })
  _playCurrentTrack(store, engine).catch(console.error)
}

const playPrev = (store: Store, engine: AudioEngine): void => {
  const { filteredTracks, currentTrackIndex } = store.getState()
  if (!filteredTracks.length) return

  if (engine.currentTime > 3) {
    engine.seek(0)
    store.dispatch({ type: ActionType.TIME_UPDATED, payload: { currentTime: 0, duration: engine.duration } })
    return
  }

  const prev = (currentTrackIndex - 1 + filteredTracks.length) % filteredTracks.length
  store.dispatch({ type: ActionType.TRACK_SELECTED, payload: prev })
  _playCurrentTrack(store, engine).catch(console.error)
}

const _playCurrentTrack = async (store: Store, engine: AudioEngine): Promise<void> => {
  const { filteredTracks, currentTrackIndex, audioPort } = store.getState()
  const track = filteredTracks[currentTrackIndex]
  if (!track) return

  const { buildAudioUrl } = await import('../utils/audio')
  const url = buildAudioUrl(track.path, audioPort)

  try {
    await engine.play(url)
    store.dispatch({ type: ActionType.PLAYBACK_STARTED })
  } catch {
    store.dispatch({ type: ActionType.PLAYBACK_PAUSED })
  }
}

const seekFromCanvas = (e: MouseEvent, canvas: HTMLCanvasElement, store: Store, engine: AudioEngine): void => {
  const rect = canvas.getBoundingClientRect()
  const ratio = (e.clientX - rect.left) / rect.width
  const newTime = ratio * store.getState().duration
  engine.seek(newTime)
  store.dispatch({ type: ActionType.TIME_UPDATED, payload: { currentTime: newTime, duration: engine.duration } })
}

// ─── Event binding ────────────────────────────────────────────

export const bindNowPlayingEvents = (store: Store, engine: AudioEngine): void => {
  const { dispatch } = store

  const expandHandlers = [elNpBarExpand, elNpBarTitle, elNpBarArtist]
  for (const el of expandHandlers) {
    el.addEventListener('click', (e: Event) => {
      e.stopPropagation()
      dispatch({ type: ActionType.NOW_PLAYING_EXPANDED })
      navigateNowPlaying(true)
    })
  }

  elNpBackBtn.addEventListener('click', () => {
    dispatch({ type: ActionType.NOW_PLAYING_COLLAPSED })
    history.back()
  })

  elNpBarPlayBtn.addEventListener('click', (e: Event) => { e.stopPropagation(); togglePlayPause(store, engine) })
  elNpBarPrevBtn.addEventListener('click', (e: Event) => { e.stopPropagation(); playPrev(store, engine) })
  elNpBarNextBtn.addEventListener('click', (e: Event) => { e.stopPropagation(); playNext(store, engine) })

  elNpPlayBtn.addEventListener('click', () => { togglePlayPause(store, engine) })
  elNpPrevBtn.addEventListener('click', () => { playPrev(store, engine) })
  elNpNextBtn.addEventListener('click', () => { playNext(store, engine) })

  elNpVolume.addEventListener('input', () => {
    const vol = Number.parseFloat(elNpVolume.value)
    engine.setVolume(vol)
    dispatch({ type: ActionType.VOLUME_CHANGED, payload: vol })
  })

  elNpWaveformCanvas.addEventListener('click', (e: MouseEvent) => { seekFromCanvas(e, elNpWaveformCanvas, store, engine) })
  elNpBarWaveform.addEventListener('click', (e: MouseEvent) => { e.stopPropagation(); seekFromCanvas(e, elNpBarWaveform, store, engine) })

  engine.onTimeUpdate((currentTime, duration) => {
    dispatch({ type: ActionType.TIME_UPDATED, payload: { currentTime, duration } })
  })
  engine.onEnded(() => { playNext(store, engine) })
  engine.onError(() => { dispatch({ type: ActionType.PLAYBACK_PAUSED }) })
  engine.onLoadedMetadata(duration => {
    dispatch({ type: ActionType.DURATION_SET, payload: duration })
  })

  store.subscribe(renderNowPlaying)
}

// ─── Toggle helper ────────────────────────────────────────────

const togglePlayPause = (store: Store, engine: AudioEngine): void => {
  const { isPlaying, currentTrackIndex, filteredTracks } = store.getState()
  if (currentTrackIndex < 0 || !filteredTracks.length) return

  if (isPlaying) {
    engine.pause()
    store.dispatch({ type: ActionType.PLAYBACK_PAUSED })
  } else {
    engine.resume()
      .then(() => { store.dispatch({ type: ActionType.PLAYBACK_STARTED }) })
      .catch(() => { store.dispatch({ type: ActionType.PLAYBACK_PAUSED }) })
  }
}

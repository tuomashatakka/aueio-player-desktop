import { useCallback, useRef } from 'react'
import { useStore, useEngine } from '../context'
import { ActionType } from '../state/actions'
import { buildAudioUrl } from '../utils/audio'
import { loadWaveformData } from '../audio/waveform'


export const usePlayback = () => {
  const store  = useStore()
  const engine = useEngine()

  const storeRef = useRef(store)
  // eslint-disable-next-line functional/immutable-data
  storeRef.current = store

  const engineRef = useRef(engine)
  // eslint-disable-next-line functional/immutable-data
  engineRef.current = engine

  const playCurrentTrack = useCallback(async () => {
    const s = storeRef.current.getState()
    const { filteredTracks, currentTrackIndex, audioPort } = s
    const track = filteredTracks[currentTrackIndex]
    if (!track)
      return

    const url = buildAudioUrl(track.path, audioPort)
    try {
      await engineRef.current.play(url)
      storeRef.current.dispatch({ type: ActionType.PLAYBACK_STARTED })
    }
    catch {
      storeRef.current.dispatch({ type: ActionType.PLAYBACK_PAUSED })
      return
    }

    const ctx = engineRef.current.audioContext
    if (!ctx || !audioPort)
      return

    try {
      const waveform = await loadWaveformData(url, ctx)
      storeRef.current.dispatch({ type: ActionType.WAVEFORM_LOADED, payload: waveform })
    }
    catch {
      storeRef.current.dispatch({ type: ActionType.WAVEFORM_LOADED, payload: new Float32Array(200).fill(0.3) })
    }
  }, [])

  const playNext = useCallback(() => {
    const { filteredTracks } = storeRef.current.getState()
    if (!filteredTracks.length)
      return

    const { currentTrackIndex } = storeRef.current.getState()
    const next = (currentTrackIndex + 1) % filteredTracks.length
    storeRef.current.dispatch({ type: ActionType.TRACK_SELECTED, payload: next })
    playCurrentTrack().catch(console.error)
  }, [ playCurrentTrack ])

  const playPrev = useCallback(() => {
    const { filteredTracks } = storeRef.current.getState()
    if (!filteredTracks.length)
      return

    const { currentTrackIndex } = storeRef.current.getState()
    if (engineRef.current.currentTime > 3) {
      engineRef.current.seek(0)
      storeRef.current.dispatch({ type: ActionType.TIME_UPDATED, payload: { currentTime: 0, duration: engineRef.current.duration }})
      return
    }

    const prev = (currentTrackIndex - 1 + filteredTracks.length) % filteredTracks.length
    storeRef.current.dispatch({ type: ActionType.TRACK_SELECTED, payload: prev })
    playCurrentTrack().catch(console.error)
  }, [ playCurrentTrack ])

  const togglePlayPause = useCallback(() => {
    const s = storeRef.current.getState()
    const { isPlaying, currentTrackIndex, filteredTracks } = s
    if (currentTrackIndex < 0 || !filteredTracks.length)
      return

    if (isPlaying) {
      engineRef.current.pause()
      storeRef.current.dispatch({ type: ActionType.PLAYBACK_PAUSED })
    }
    else {
      engineRef.current.resume()
        .then(() =>
          storeRef.current.dispatch({ type: ActionType.PLAYBACK_STARTED }))
        .catch(() =>
          storeRef.current.dispatch({ type: ActionType.PLAYBACK_PAUSED }))
    }
  }, [])

  const selectAndPlay = useCallback(async (idx: number) => {
    const s = storeRef.current.getState()
    const track = s.filteredTracks[idx]
    if (!track)
      return

    if (idx === s.currentTrackIndex && s.isPlaying) {
      engineRef.current.pause()
      storeRef.current.dispatch({ type: ActionType.PLAYBACK_PAUSED })
      return
    }

    storeRef.current.dispatch({ type: ActionType.TRACK_SELECTED, payload: idx })

    const url = buildAudioUrl(track.path, s.audioPort)

    try {
      await engineRef.current.play(url)
      storeRef.current.dispatch({ type: ActionType.PLAYBACK_STARTED })
    }
    catch {
      storeRef.current.dispatch({ type: ActionType.PLAYBACK_PAUSED })
      return
    }

    const ctx = engineRef.current.audioContext
    if (!ctx || !s.audioPort)
      return

    try {
      const waveform = await loadWaveformData(url, ctx)
      storeRef.current.dispatch({ type: ActionType.WAVEFORM_LOADED, payload: waveform })
    }
    catch {
      storeRef.current.dispatch({ type: ActionType.WAVEFORM_LOADED, payload: new Float32Array(200).fill(0.3) })
    }
  }, [])

  const seek = useCallback((ratio: number) => {
    const duration = storeRef.current.getState().duration
    const newTime = ratio * duration
    engineRef.current.seek(newTime)
    storeRef.current.dispatch({ type: ActionType.TIME_UPDATED, payload: { currentTime: newTime, duration: engineRef.current.duration }})
  }, [])

  return { playCurrentTrack, playNext, playPrev, togglePlayPause, selectAndPlay, seek }
}

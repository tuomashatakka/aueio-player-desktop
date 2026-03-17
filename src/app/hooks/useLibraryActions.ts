import { useCallback, useRef } from 'react'
import { useStore, useRPC } from '../context'
import type { Track } from '../state/types'
import { ActionType } from '../state/actions'


export const useLibraryActions = () => {
  const store = useStore()
  const rpc   = useRPC()

  const storeRef = useRef(store)
  // eslint-disable-next-line functional/immutable-data
  storeRef.current = store

  const triggerScan = useCallback(async () => {
    const { settings } = storeRef.current.getState()
    if (!settings.folders.length) {
      storeRef.current.dispatch({ type: ActionType.TRACKS_LOADED, payload: []})
      return
    }
    storeRef.current.dispatch({ type: ActionType.LIBRARY_LOADING })
    try {
      const tracks = await rpc.request.scanLibrary({ folders: settings.folders })
      storeRef.current.dispatch({ type: ActionType.TRACKS_LOADED, payload: tracks })
    }
    catch {
      storeRef.current.dispatch({ type: ActionType.TRACKS_LOADED, payload: []})
    }
  }, [ rpc ])

  const handleSaveTag = useCallback((idx: number, track: Track, tags: Partial<Track>) => {
    storeRef.current.dispatch({ type: ActionType.TRACK_TAGS_UPDATED, payload: { id: track.id, tags }})
    rpc.request.saveTrackTags({ id: track.id, tags }).catch(console.error)
  }, [ rpc ])

  const handleSaveRating = useCallback((idx: number, track: Track, rating: number) => {
    storeRef.current.dispatch({ type: ActionType.TRACK_TAGS_UPDATED, payload: { id: track.id, tags: { rating }}})
    rpc.request.saveTrackTags({ id: track.id, tags: { rating }}).catch(console.error)
  }, [ rpc ])

  const handleTagDialogSave = useCallback((idx: number, tags: Partial<Track>) => {
    const track = storeRef.current.getState().filteredTracks[idx]
    if (!track)
      return
    storeRef.current.dispatch({ type: ActionType.TRACK_TAGS_UPDATED, payload: { id: track.id, tags }})
    rpc.request.saveTrackTags({ id: track.id, tags }).catch(console.error)
  }, [ rpc ])

  return { triggerScan, handleSaveTag, handleSaveRating, handleTagDialogSave }
}

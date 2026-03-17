import { useEffect, useRef } from 'react'
import { useStore, useEngine } from '../context'
import { ActionType } from '../state/actions'


/**
 * Binds AudioEngine events (timeupdate, ended, error, loadedmetadata)
 * to store dispatches. Accepts `onTrackEnded` callback for end-of-track behavior.
 */
export const useEngineEvents = (onTrackEnded: () => void): void => {
  const store  = useStore()
  const engine = useEngine()

  const storeRef = useRef(store)
  // eslint-disable-next-line functional/immutable-data
  storeRef.current = store

  const engineRef = useRef(engine)
  // eslint-disable-next-line functional/immutable-data
  engineRef.current = engine

  const onTrackEndedRef = useRef(onTrackEnded)
  // eslint-disable-next-line functional/immutable-data
  onTrackEndedRef.current = onTrackEnded

  useEffect(() => {
    const cleanupTime = engineRef.current.onTimeUpdate((currentTime, duration) => {
      storeRef.current.dispatch({ type: ActionType.TIME_UPDATED, payload: { currentTime, duration }})
    })
    const cleanupEnded = engineRef.current.onEnded(() => {
      onTrackEndedRef.current()
    })
    const cleanupError = engineRef.current.onError(() =>
      storeRef.current.dispatch({ type: ActionType.PLAYBACK_PAUSED }))
    const cleanupMeta = engineRef.current.onLoadedMetadata(duration => {
      storeRef.current.dispatch({ type: ActionType.DURATION_SET, payload: duration })
    })

    return () => {
      cleanupTime(); cleanupEnded(); cleanupError(); cleanupMeta()
    }
  }, [])
}

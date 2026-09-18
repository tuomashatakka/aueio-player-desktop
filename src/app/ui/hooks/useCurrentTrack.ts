/** The track the player is on, resolved from `player.playback.trackId` against the library. Shared by `Player`'s children. */
import type { Track } from '../../domain'
import { useStore, useStores } from './useStore'


export function useCurrentTrack (): Track | undefined {
  const stores = useStores()

  const trackId = useStore(stores.player, state =>
    state.playback.trackId)
  const byId = useStore(stores.library, state =>
    state.byId)

  return trackId ? byId.get(trackId) : undefined
}

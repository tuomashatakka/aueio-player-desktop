/** The current track's analysis entry (`Analysis`, `'pending'`, or a failure), and the narrowing guard for it. */
import { Analysis } from '../../domain'
import type { AnalysisEntry } from '../../state/player'
import { useStore, useStores } from './useStore'
import { useCurrentTrack } from './useCurrentTrack'


export function useCurrentAnalysis (): AnalysisEntry | undefined {
  const stores = useStores()
  const track  = useCurrentTrack()

  return useStore(stores.player, state =>
    track ? state.analyses.get(track.id) : undefined)
}

export function isAnalysis (entry: AnalysisEntry | undefined): entry is Analysis {
  return entry instanceof Analysis
}

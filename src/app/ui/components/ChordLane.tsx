/** The largest type in the app: the sounding chord plus the ones queued after it. */
import type { ReactElement } from 'react'
import { isAnalysis, useCurrentAnalysis } from '../hooks/useCurrentAnalysis'
import { useStore, useStores } from '../hooks/useStore'


export function ChordLane (): ReactElement {
  const stores = useStores()
  const entry  = useCurrentAnalysis()

  const position = useStore(stores.player, state =>
    state.playback.position)

  const analysis     = isAnalysis(entry) ? entry : undefined
  const currentIndex = analysis ? analysis.chordAt(position) : -1
  const currentChord = analysis && currentIndex >= 0 ? analysis.chords[currentIndex] : undefined
  const queued       = analysis ? analysis.queuedChords(position) : []

  return <p className="chord-lane">
    <span className="current">{currentChord?.label ?? '—'}</span>

    {queued.map((chord, index) =>
      <span key={ `${chord.start}-${index}` }>{chord.label}</span>)}
  </p>
}

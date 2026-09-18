/** The `<dl class="readout">`: Key, Tempo and the sounding Chord label. */
import type { ReactElement } from 'react'
import { isAnalysis, useCurrentAnalysis } from '../hooks/useCurrentAnalysis'
import { useStore, useStores } from '../hooks/useStore'


export function Readout (): ReactElement {
  const stores = useStores()
  const entry  = useCurrentAnalysis()

  const position = useStore(stores.player, state =>
    state.playback.position)

  const analysis     = isAnalysis(entry) ? entry : undefined
  const currentIndex = analysis ? analysis.chordAt(position) : -1
  const currentChord = analysis && currentIndex >= 0 ? analysis.chords[currentIndex] : undefined

  const keyLabel   = analysis && analysis.key.label.length > 0 ? analysis.key.label : '—'
  const tempoLabel = analysis && analysis.tempo.bpm > 0 ? `${Math.round(analysis.tempo.bpm)} BPM` : '—'

  return <dl className="readout">
    <dt>Key</dt>
    <dd>{keyLabel}</dd>
    <dt>Tempo</dt>
    <dd>{tempoLabel}</dd>
    <dt>Chord</dt>
    <dd>{currentChord?.label ?? '—'}</dd>
  </dl>
}

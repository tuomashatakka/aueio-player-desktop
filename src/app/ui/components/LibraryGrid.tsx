/** The `grid-sm`/`grid-lg` density view: an `<ul>` of `<article>` cards. */
import type { ReactElement } from 'react'
import type { Track } from '../../domain'
import { useStore, useStores } from '../hooks/useStore'
import { TrackCard } from './TrackCard'


interface LibraryGridProps {
  readonly tracks: readonly Track[]
}

export function LibraryGrid ({ tracks }: LibraryGridProps): ReactElement {
  const stores    = useStores()
  const selection = useStore(stores.ui, state =>
    state.selection)

  const orderedIds = tracks.map(track =>
    track.id)
  const context     = { orderedIds, selectedIds: selection.ids }

  return <ul>
    {tracks.map((track, index) =>
      <TrackCard key={ track.id } track={ track } index={ index } selected={ selection.ids.has(track.id) } context={ context } />)}
  </ul>
}

/**
 * The library screen: breadcrumbs, grouping/density toggles, and the track
 * list itself — a flat `TrackTable`/`LibraryGrid`, or one `<section>` per
 * group when `ui.grouping` is active. Scoped by `ui.scope` (folder, playlist,
 * queue/history list or group drill-down — exactly one at a time, see
 * `UiScope`'s docstring) then narrowed by the search box. See AGENTS.md L8.
 */
import type { ChangeEvent, ReactElement } from 'react'
import { useState } from 'react'
import type { GroupBlock, Track } from '../../domain'
import { tracksForPayload } from '../../domain'
import type { LibraryState } from '../../state/library'
import { selectByPlaylist, selectFiltered, selectGroups, selectSorted, selectTracks } from '../../state/library'
import type { PlayerState } from '../../state/player'
import type { Density, UiGrouping, UiScope } from '../../state/ui'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { LibraryGrid } from '../components/LibraryGrid'
import { TrackTable } from '../components/TrackTable'
import { useStore, useStores } from '../hooks/useStore'


const GRID_DENSITIES = new Set<Density>([ 'grid-sm', 'grid-lg' ])

const GROUPING_OPTIONS: ReadonlyArray<{ readonly value: UiGrouping, readonly label: string }> = [
  { value: 'none', label: 'Flat' },
  { value: 'album', label: 'Album' },
  { value: 'artist', label: 'Artist' },
]

const DENSITY_OPTIONS: ReadonlyArray<{ readonly value: Density, readonly label: string }> = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal', label: 'Normal' },
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'grid-sm', label: 'Grid' },
  { value: 'grid-lg', label: 'Grid Large' },
]

function resolveIds (ids: readonly string[], byId: ReadonlyMap<string, Track>): readonly Track[] {
  return ids.flatMap(id => {
    const track = byId.get(id)
    return track ? [ track ] : []
  })
}

function matchesSearch (track: Track, search: string): boolean {
  const query = search.trim().toLowerCase()
  if (query.length === 0)
    return true

  return track.title.toLowerCase().includes(query) ||
    track.artist.toLowerCase().includes(query) ||
    track.album.toLowerCase().includes(query)
}

/**
 * The tracks the library body shows: `scope` narrows to one facet (playlist,
 * queue/history, a drilled-into group, or a folder — `''` means "no folder",
 * the same "back to roots" convention {@link Breadcrumbs} uses), then the
 * search box narrows further. No scope at all falls back to
 * {@link selectFiltered}, which already applies the search on its own.
 */
function visibleTracks (libraryState: LibraryState, playerState: PlayerState, scope: UiScope): readonly Track[] {
  const search = libraryState.search

  if (scope.playlist !== null)
    return selectByPlaylist(libraryState, scope.playlist).filter(track =>
      matchesSearch(track, search))

  if (scope.list === 'queue')
    return resolveIds(playerState.queue.items, libraryState.byId).filter(track =>
      matchesSearch(track, search))

  if (scope.list === 'history')
    return resolveIds(playerState.queue.history, libraryState.byId).filter(track =>
      matchesSearch(track, search))

  const all = selectTracks(libraryState)

  if (scope.group !== null)
    return tracksForPayload({ kind: 'group', grouping: scope.group.grouping, key: scope.group.key, label: '' }, all)
      .filter(track =>
        matchesSearch(track, search))

  if (scope.folder !== null && scope.folder.length > 0)
    return tracksForPayload({ kind: 'folder', path: scope.folder, label: '' }, all)
      .filter(track =>
        matchesSearch(track, search))

  return selectFiltered(libraryState)
}

export function Library (): ReactElement {
  const stores = useStores()

  const libraryState = useStore(stores.library, state =>
    state)
  const playerState   = useStore(stores.player, state =>
    state)
  const scope    = useStore(stores.ui, state =>
    state.scope)
  const density  = useStore(stores.ui, state =>
    state.density)
  const grouping = useStore(stores.ui, state =>
    state.grouping)
  const sort     = useStore(stores.ui, state =>
    state.sort)

  const scoped = visibleTracks(libraryState, playerState, scope)
  const sorted = selectSorted(scoped, sort.key, sort.dir)
  const groups = selectGroups(sorted, grouping)
  const isGrid = GRID_DENSITIES.has(density)

  function onGroupingChange (value: UiGrouping): void {
    stores.ui.dispatch({ type: 'ui/groupingSet', grouping: value })
  }

  function onDensityChange (value: Density): void {
    stores.ui.dispatch({ type: 'ui/densitySet', density: value })
  }

  return <>
    <header>
      <Breadcrumbs />

      <fieldset className="segmented">
        <legend className="sr-only">Group by</legend>

        {GROUPING_OPTIONS.map(option =>
          <SegmentedOption
            key={ option.value } name="group" checked={ grouping === option.value }
            label={ option.label } onSelect={ () =>
              onGroupingChange(option.value) } />)}
      </fieldset>

      <fieldset className="segmented">
        <legend className="sr-only">Density</legend>

        {DENSITY_OPTIONS.map(option =>
          <SegmentedOption
            key={ option.value } name="density" checked={ density === option.value }
            label={ option.label } onSelect={ () =>
              onDensityChange(option.value) } />)}
      </fieldset>
    </header>

    {grouping === 'none'
      ? isGrid ? <LibraryGrid tracks={ sorted } /> : <TrackTable tracks={ sorted } />
      : groups.map(group =>
        <GroupSection key={ group.key } group={ group } density={ density } />)}
  </>
}

interface SegmentedOptionProps {
  readonly name:     string
  readonly checked:  boolean
  readonly label:    string
  readonly onSelect: () => void
}

function SegmentedOption ({ name, checked, label, onSelect }: SegmentedOptionProps): ReactElement {
  function onChange (_event: ChangeEvent<HTMLInputElement>): void {
    onSelect()
  }

  return <label>
    <input type="radio" name={ name } checked={ checked } onChange={ onChange } />
    {' '}
    {label}
  </label>
}

interface GroupSectionProps {
  readonly group:   GroupBlock
  readonly density: Density
}

function GroupSection ({ group, density }: GroupSectionProps): ReactElement {
  const [ expanded, setExpanded ] = useState(true)
  const isGrid                    = GRID_DENSITIES.has(density)

  function onToggle (): void {
    setExpanded(current =>
      !current)
  }

  return <section>
    <h2>
      <button aria-expanded={ expanded } onClick={ onToggle }>{group.label} · {group.subtitle}</button>
    </h2>

    {expanded && (isGrid ? <LibraryGrid tracks={ group.tracks } /> : <TrackTable tracks={ group.tracks } />)}
  </section>
}

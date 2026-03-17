import { memo, useCallback } from 'react'
import type { Track } from '../../state/types'
import { ActionType } from '../../state/actions'
import { useSelector, useDispatch } from '../../hooks/useSelector'
import {
  selectActiveView, selectFilteredTracks, selectCurrentTrackIndex,
  selectIsPlaying, selectIsLoading, selectSearchQuery, selectSortKey,
  selectSortDir, selectTracks, selectTreeGroupBy, selectTreeSelectedNode,
  selectTreeExpanded,
} from '../../selectors/index'
import { navigate } from '../../navigation/index'
import { TreePanel } from '../composite/TreePanel'
import { SortHeader } from '../atomic/SortHeader'
import { TrackRow } from '../composite/TrackRow'


type Props = {
  readonly onPlayTrack:  (idx: number) => void
  readonly onSaveTag:    (idx: number, track: Track, tags: Partial<Track>) => void
  readonly onSaveRating: (idx: number, track: Track, rating: number) => void
}

export const LibraryView = memo(({ onPlayTrack, onSaveTag, onSaveRating }: Props) => {
  const dispatch       = useDispatch()
  const isActive       = useSelector(selectActiveView) === 'library'
  const filteredTracks = useSelector(selectFilteredTracks)
  const currentTrackIndex = useSelector(selectCurrentTrackIndex)
  const isPlaying      = useSelector(selectIsPlaying)
  const isLoading      = useSelector(selectIsLoading)
  const searchQuery    = useSelector(selectSearchQuery)
  const sortKey        = useSelector(selectSortKey)
  const sortDir        = useSelector(selectSortDir)
  const tracks         = useSelector(selectTracks)
  const treeGroupBy    = useSelector(selectTreeGroupBy)
  const treeSelectedNode = useSelector(selectTreeSelectedNode)
  const treeExpanded   = useSelector(selectTreeExpanded)
  const count          = filteredTracks.length

  const handleEdit = useCallback((idx: number, track: Track, focusField?: string) => {
    dispatch({ type: ActionType.TAG_EDIT_OPENED, payload: idx })
    void focusField
  }, [ dispatch ])

  const handleToggle = useCallback(() => {
    dispatch({ type: ActionType.TREE_TOGGLED })
  }, [ dispatch ])

  const handleNodeSelect = useCallback((key: string | null) => {
    dispatch({ type: ActionType.TREE_NODE_SELECTED, payload: key })
  }, [ dispatch ])

  const handleGroupChange = useCallback((groupBy: typeof treeGroupBy) => {
    dispatch({ type: ActionType.TREE_GROUP_CHANGED, payload: groupBy })
  }, [ dispatch ])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: ActionType.SEARCH_CHANGED, payload: e.target.value })
  }, [ dispatch ])

  const handleSort = useCallback((key: typeof sortKey, dir: typeof sortDir) => {
    dispatch({ type: ActionType.SORT_CHANGED, payload: { key, dir }})
  }, [ dispatch ])

  const handleGoToSettings = useCallback(() => {
    dispatch({ type: ActionType.VIEW_CHANGED, payload: 'settings' })
    navigate('settings')
  }, [ dispatch ])

  const handleRating = useCallback((i: number, rating: number) => {
    const tr = filteredTracks[i]
    if (tr)
      onSaveRating(i, tr, rating)
  }, [ filteredTracks, onSaveRating ])

  return (
    <section id='library-view' data-view='library' className={isActive ? 'active' : ''}>
      <div id='library-toolbar'>
        <input
          id='search-input'
          type='search'
          placeholder='Search tracks…'
          aria-label='Search tracks'
          value={searchQuery}
          onChange={handleSearchChange}
        />

        <span id='track-count'>
          {!isLoading && count > 0 ? `${count} track${count === 1 ? '' : 's'}` : ''}
        </span>
      </div>

      <div id='library-body'>

        <TreePanel
          tracks={tracks}
          groupBy={treeGroupBy}
          selectedNode={treeSelectedNode}
          expanded={treeExpanded}
          onToggle={handleToggle}
          onNodeSelect={handleNodeSelect}
          onGroupChange={handleGroupChange}
        />

        <div id='library-table-wrapper'>

          {/* Loading overlay – always in DOM, visibility toggled */}
          <div id='loading-overlay' hidden={!isLoading}>
            <div className='spinner' aria-hidden='true' />
            <span>Scanning library…</span>
          </div>

          {/* Empty state – always in DOM */}
          <div id='library-empty' hidden={isLoading || count > 0}>
            <div className='empty-icon' aria-hidden='true'>🎵</div>
            <p className='empty-title'>No tracks yet</p>
            <p className='empty-hint'>Add music folders in Settings to get started</p>

            <button
              id='empty-goto-settings'
              data-variant='primary'
              data-size='sm'
              onClick={handleGoToSettings}
            >
              Open Settings
            </button>
          </div>

          <SortHeader
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />

          {/* Track list – always in DOM, visibility toggled */}
          <div
            id='track-list'
            role='grid'
            aria-label='Music library'
            hidden={isLoading || count === 0}
          >
            {filteredTracks.map((track, idx) =>

              <TrackRow
                key={track.id}
                track={track}
                index={idx}
                isCurrent={idx === currentTrackIndex}
                isPlaying={idx === currentTrackIndex && isPlaying}
                onPlay={onPlayTrack}
                onEdit={handleEdit}
                onRating={handleRating}
              />
            )}
          </div>

        </div>
      </div>
    </section>
  )
})

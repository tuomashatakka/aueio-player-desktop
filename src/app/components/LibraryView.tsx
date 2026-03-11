import type { PlayerState, Track } from '../state/types'
import type { Store } from '../state/index'
import { ActionType } from '../state/actions'
import { navigate } from '../navigation/index'
import { TreePanel } from './TreePanel'
import { SortHeader } from './SortHeader'
import { TrackRow } from './TrackRow'


type Props = {
  state: PlayerState
  dispatch: Store['dispatch']
  onPlayTrack: (idx: number) => void
  onSaveTag: (idx: number, track: Track, tags: Partial<Track>) => void
  onSaveRating: (idx: number, track: Track, rating: number) => void
}

export const LibraryView = ({ state, dispatch, onPlayTrack, onSaveTag, onSaveRating }: Props) => {
  const isActive = state.activeView === 'library'
  const { filteredTracks, currentTrackIndex, isPlaying, isLoading } = state
  const count = filteredTracks.length

  const handleEdit = (idx: number, track: Track, focusField?: string) => {
    dispatch({ type: ActionType.TAG_EDIT_OPENED, payload: idx })
    // focusField is stored for the dialog to use (passed via state.tagEditingIndex)
    void focusField
  }

  return (
    <section id="library-view" data-view="library" className={isActive ? 'active' : ''}>
      <div id="library-toolbar">
        <input
          id="search-input"
          type="search"
          placeholder="Search tracks…"
          aria-label="Search tracks"
          value={state.searchQuery}
          onChange={(e) => dispatch({ type: ActionType.SEARCH_CHANGED, payload: e.target.value })}
        />
        <span id="track-count">
          {!isLoading && count > 0 ? `${count} track${count === 1 ? '' : 's'}` : ''}
        </span>
      </div>

      <div id="library-body">

        <TreePanel
          tracks={state.tracks}
          groupBy={state.treeGroupBy}
          selectedNode={state.treeSelectedNode}
          expanded={state.treeExpanded}
          onToggle={() => dispatch({ type: ActionType.TREE_TOGGLED })}
          onNodeSelect={(key) => dispatch({ type: ActionType.TREE_NODE_SELECTED, payload: key })}
          onGroupChange={(groupBy) => dispatch({ type: ActionType.TREE_GROUP_CHANGED, payload: groupBy })}
        />

        <div id="library-table-wrapper">

          {/* Loading overlay – always in DOM, visibility toggled */}
          <div id="loading-overlay" hidden={!isLoading}>
            <div className="spinner" aria-hidden="true" />
            <span>Scanning library…</span>
          </div>

          {/* Empty state – always in DOM */}
          <div id="library-empty" hidden={isLoading || count > 0}>
            <div className="empty-icon" aria-hidden="true">🎵</div>
            <p className="empty-title">No tracks yet</p>
            <p className="empty-hint">Add music folders in Settings to get started</p>
            <button
              id="empty-goto-settings"
              data-variant="primary"
              data-size="sm"
              onClick={() => {
                dispatch({ type: ActionType.VIEW_CHANGED, payload: 'settings' })
                navigate('settings')
              }}
            >
              Open Settings
            </button>
          </div>

          <SortHeader
            sortKey={state.sortKey}
            sortDir={state.sortDir}
            onSort={(key, dir) => dispatch({ type: ActionType.SORT_CHANGED, payload: { key, dir } })}
          />

          {/* Track list – always in DOM, visibility toggled */}
          <div
            id="track-list"
            role="grid"
            aria-label="Music library"
            hidden={isLoading || count === 0}
          >
            {filteredTracks.map((track, idx) => (
              <TrackRow
                key={track.id}
                track={track}
                index={idx}
                isCurrent={idx === currentTrackIndex}
                isPlaying={idx === currentTrackIndex && isPlaying}
                onPlay={onPlayTrack}
                onEdit={handleEdit}
                onRating={(i, rating) => {
                  const tr = filteredTracks[i]
                  if (tr) onSaveRating(i, tr, rating)
                }}
              />
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}

import type { Store } from '../../state/index'
import type { RPCClient } from '../../rpc/index'
import type { AudioEngine } from '../../audio/AudioEngine'
import { StoreContext, RPCContext, EngineContext } from '../../context'
import { usePlayback, useEngineEvents, useAppInit, useThemeSync, useLibraryActions } from '../../hooks/index'
import { Topbar } from '../composite/Topbar'
import { LibraryView } from './LibraryView'
import { SettingsView } from './SettingsView'
import { NowPlayingView } from './NowPlayingView'
import { NowPlayingBar } from '../composite/NowPlayingBar'
import { TagDialog } from '../composite/TagDialog'


type Props = {
  readonly store:  Store
  readonly rpc:    RPCClient
  readonly engine: AudioEngine
}

const AppInner = () => {
  const { playNext, playPrev, togglePlayPause, selectAndPlay } = usePlayback()
  const { triggerScan, handleSaveTag, handleSaveRating, handleTagDialogSave } = useLibraryActions()
  useEngineEvents(playNext)
  useAppInit(triggerScan)
  useThemeSync()

  return (
    <>
      <Topbar />

      <main id='views'>
        <LibraryView
          onPlayTrack={selectAndPlay}
          onSaveTag={handleSaveTag}
          onSaveRating={handleSaveRating}
        />

        <SettingsView
          onTriggerScan={triggerScan}
        />
      </main>

      <NowPlayingView
        onPlayNext={playNext}
        onPlayPrev={playPrev}
        onTogglePlayPause={togglePlayPause}
      />

      <NowPlayingBar
        onPlayNext={playNext}
        onPlayPrev={playPrev}
        onTogglePlayPause={togglePlayPause}
      />

      <TagDialog
        onSave={handleTagDialogSave}
      />
    </>
  )
}

export const App = ({ store, rpc, engine }: Props) =>
  <StoreContext.Provider value={store}>
    <RPCContext.Provider value={rpc}>
      <EngineContext.Provider value={engine}>
        <AppInner />
      </EngineContext.Provider>
    </RPCContext.Provider>
  </StoreContext.Provider>

/** `createStores()` wires up the app's four independent stores. See AGENTS.md L4. */
import { createStore } from './store'
import type { Store } from './store'
import { createLibraryState, libraryReducer } from './library'
import type { LibraryAction, LibraryState } from './library'
import { createPlayerState, playerReducer } from './player'
import type { PlayerAction, PlayerState } from './player'
import { createSettingsState, settingsReducer } from './settings'
import type { SettingsAction, SettingsState } from './settings'
import { createUiState, uiReducer } from './ui'
import type { UiAction, UiState } from './ui'


export interface Stores {
  readonly library:  Store<LibraryState, LibraryAction>
  readonly player:   Store<PlayerState, PlayerAction>
  readonly settings: Store<SettingsState, SettingsAction>
  readonly ui:       Store<UiState, UiAction>
}

export function createStores (): Stores {
  return {
    library:  createStore(libraryReducer, createLibraryState()),
    player:   createStore(playerReducer, createPlayerState()),
    settings: createStore(settingsReducer, createSettingsState()),
    ui:       createStore(uiReducer, createUiState()),
  }
}

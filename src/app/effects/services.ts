/**
 * The effect layer's one bag of dependencies. `effects/` is the only folder
 * allowed to import both `state/` and `services/` (see AGENTS.md L6 and
 * `eslint.config.mjs`'s `import/no-restricted-paths`) — every effect takes
 * `(stores, services)` and hands back a {@link Dispose}, so a test swaps
 * every field here for a fake without touching a real socket, `<audio>` or
 * `Worker`.
 */
import type { AnalysisClient } from '../services/analysis/client'
import type { AudioEngine } from '../services/audio/engine'
import type { Gateway } from '../services/gateway/Gateway'
import type { KeybindingStore } from '../services/keybindings'
import type { Stores } from '../state'


/** Unsubscribes / tears down one effect. Every effect returns one. */
export type Dispose = () => void

export type Platform = 'macos' | 'windows' | 'linux' | 'web'

export interface Services {
  readonly gateway:     Gateway
  readonly engine:      AudioEngine
  readonly analysis:    AnalysisClient
  readonly keybindings: KeybindingStore
  readonly platform:    Platform
  readonly storage:     Pick<Storage, 'getItem' | 'setItem'>
  readonly root:        HTMLElement | null
}

/**
 * `(stores, services) => Dispose` — the shape every file in `effects/`
 * exports one of, and what `effects/index.ts` registers.
 */
export type Effect = (stores: Stores, services: Services) => Dispose

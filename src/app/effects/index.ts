/**
 * Registers every effect once, in the order `bootstrap.ts`'s network calls
 * imply they should start in. `startEffects` is called exactly once, from
 * `app/index.tsx`, before the tree renders. See AGENTS.md L6.
 */
import { analysis } from './analysis'
import { appearance } from './appearance'
import { bootstrap } from './bootstrap'
import { contextMenu } from './contextMenu'
import { keyboard } from './keyboard'
import { library } from './library'
import { mediaSession } from './mediaSession'
import { persistence } from './persistence'
import { player } from './player'
import type { Dispose, Effect, Services } from './services'
import type { Stores } from '../state'


const REGISTRY: readonly Effect[] = [
  bootstrap,
  library,
  player,
  analysis,
  appearance,
  mediaSession,
  keyboard,
  persistence,
  contextMenu,
]

export function startEffects (stores: Stores, services: Services): Dispose {
  const disposers = REGISTRY.map(effect =>
    effect(stores, services))

  return (): void => {
    for (const dispose of [ ...disposers ].reverse())
      dispose()
  }
}

export type { Dispose, Effect, Platform, Services } from './services'

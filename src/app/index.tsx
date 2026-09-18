/**
 * The composition root: builds the four stores, the real (or fake) gateway,
 * the audio engine, the analysis client and the keybinding store, starts
 * every effect once, then mounts `App`. See AGENTS.md L6/L8.
 *
 * `?gateway=fake` (Playwright) or the absence of `window.__electrobunWebviewId`
 * (a plain browser tab, `bun run start` before Electrobun's webview exists,
 * or this repo's own component tests) swaps in `FakeGateway` — the same
 * three-track fixture `startEffects`' tests use.
 */
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import { startEffects } from './effects'
import { createStores } from './state'
import { createAnalysisClient } from './services/analysis/client'
import type { AnalysisWorkerLike } from './services/analysis/client'
import { createAudioEngine } from './services/audio/engine'
import { FakeGateway } from './services/gateway/FakeGateway'
import { RpcGateway } from './services/gateway/RpcGateway'
import { keybindingStore } from './services/keybindings'
import type { Platform, Services } from './effects'


declare global {
  interface Window {
    __electrobunWebviewId?: string
    __electrobunPlatform?:  Platform
  }
}

function resolvePlatform (): Platform {
  return window.__electrobunPlatform ?? 'web'
}

function resolveGateway (): FakeGateway | RpcGateway {
  const useFake = new URLSearchParams(location.search).get('gateway') === 'fake' ||
    !('__electrobunWebviewId' in window)
  return useFake ? new FakeGateway() : new RpcGateway()
}

const stores = createStores()

const services: Services = {
  gateway:  resolveGateway(),
  engine:   createAudioEngine(),
  analysis: createAnalysisClient(() =>
    new Worker(new URL('../analysisWorker/index.js', document.baseURI), { type: 'module' }) as unknown as AnalysisWorkerLike),
  keybindings: keybindingStore,
  platform:    resolvePlatform(),
  storage:     localStorage,
  root:        document.documentElement,
}

startEffects(stores, services)

const mount = document.querySelector('.shell main')
if (mount)
  createRoot(mount).render(
    <App stores={ stores } />
  )

/**
 * Shared fakes for `effects/` tests: a fake `AudioEngine` (an event emitter
 * with call logs), a fake `AnalysisClient` (a script of `AnalysisEvent`s per
 * call), an in-memory `Services['storage']`, and a fake root element. Every
 * `effects/*.test.ts` builds its own `Stores`/`FakeGateway` — only the parts
 * with no equivalent already in `services/` live here.
 */
import { createKeybindingStore } from '../../../../src/app/services/keybindings'
import type { AnalysisClient, AnalysisEvent } from '../../../../src/app/services/analysis/client'
import type { AudioEngine, AudioEngineEvent, AudioEngineEvents } from '../../../../src/app/services/audio/engine'
import type {
  Dispose as GatewayDispose,
  Gateway,
  GatewayMessage,
  GatewayMessagePayload,
} from '../../../../src/app/services/gateway/Gateway'
import { DEFAULT_SETTINGS } from '../../../../src/shared/settings'
import type { DspJSON, TrackJSON } from '../../../../src/shared/dto'


export interface FakeEngine extends AudioEngine {
  readonly loadCalls:   string[]
  readonly seekCalls:   number[]
  readonly volumeCalls: number[]
  readonly dspCalls:    DspJSON[]
  playCalls:            number
  pauseCalls:           number
  emit<E extends AudioEngineEvent> (event: E, payload: AudioEngineEvents[E]): void
}

export interface FakeStorage {
  getItem (key: string): string | null
  setItem (key: string, value: string): void
  readonly data: Map<string, string>
}

export function createFakeEngine (): FakeEngine {
  const handlers = new Map<AudioEngineEvent, Set<(payload: unknown) => void>>()
  let currentTime = 0
  let duration    = 0

  return {
    loadCalls:   [],
    seekCalls:   [],
    volumeCalls: [],
    dspCalls:    [],
    playCalls:   0,
    pauseCalls:  0,
    analyser:    null,

    get currentTime () {
      return currentTime
    },
    get duration () {
      return duration
    },

    load (url) {
      this.loadCalls.push(url)
    },
    async play () {
      this.playCalls++
    },
    pause () {
      this.pauseCalls++
    },
    seek (seconds) {
      this.seekCalls.push(seconds)
      currentTime = seconds
    },
    setVolume (volume) {
      this.volumeCalls.push(volume)
    },
    applyDsp (dsp) {
      this.dspCalls.push(dsp)
    },
    async resume () {},
    dispose () {},

    on (event, listener) {
      const set = handlers.get(event) ?? new Set()
      handlers.set(event, set)

      const anyListener = listener as (payload: unknown) => void
      set.add(anyListener)
      return () =>
        set.delete(anyListener)
    },

    emit (event, payload) {
      if (event === 'time')
        currentTime = payload as number
      if (event === 'duration')
        duration = payload as number

      const set = handlers.get(event)
      if (!set)
        return
      for (const listener of [ ...set ])
        listener(payload)
    },
  }
}

export function createFakeAnalysisClient (
  script: (id: string) => AsyncIterable<AnalysisEvent>
): AnalysisClient & { readonly calls: string[] } {
  const calls: string[] = []

  return {
    calls,
    analyze (id) {
      calls.push(id)
      return script(id)
    },
  }
}

export function createFakeStorage (): FakeStorage {
  const data = new Map<string, string>()

  return {
    data,
    getItem: key =>
      data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

interface FakeRootStyle {
  fontSize: string
  setProperty (name: string, value: string): void
  getPropertyValue (name: string): string
}

export interface FakeRoot {
  readonly style:      FakeRootStyle
  readonly attributes: Map<string, string>
  readonly properties: Map<string, string>
  setAttribute (name: string, value: string): void
  getAttribute (name: string): string | null
}

export function createFakeRoot (): FakeRoot {
  const attributes = new Map<string, string>()
  const properties = new Map<string, string>()
  let fontSize      = ''

  return {
    attributes,
    properties,
    style: {
      get fontSize () {
        return fontSize
      },
      set fontSize (value: string) {
        fontSize = value
      },
      setProperty: (name, value) => {
        properties.set(name, value)
      },
      getPropertyValue: name =>
        properties.get(name) ?? '',
    },
    setAttribute: (name, value) => {
      attributes.set(name, value)
    },
    getAttribute: name =>
      attributes.get(name) ?? null,
  }
}

/** `createKeybindingStore` with no backing storage — same defaults every test starts from. */
export function createFakeKeybindingStore () {
  return createKeybindingStore()
}

type AnyHandler = (payload: unknown) => void

export type StubGateway = Gateway & {
  emit<M extends GatewayMessage> (message: M, payload: GatewayMessagePayload<M>): void
}

/**
 * A `Gateway` of all-stub methods (resolve with an empty/default value,
 * record nothing) plus `emit`, which fires whatever `on(message, ...)`
 * handlers an effect registered — the hand-crank `FakeGateway`'s own
 * `scan()`/`resolveMenu()` don't expose, needed to test coalescing and
 * message-driven effects on the test's own schedule. Pass `overrides` for
 * the one or two methods a given test cares about; everything else no-ops.
 */
export function createStubGateway (overrides: Partial<Gateway> = {}): StubGateway {
  const handlers = new Map<GatewayMessage, Set<AnyHandler>>()

  const on = <M extends GatewayMessage> (message: M, handler: (payload: GatewayMessagePayload<M>) => void): GatewayDispose => {
    const set = handlers.get(message) ?? new Set<AnyHandler>()
    handlers.set(message, set)

    const anyHandler = handler as AnyHandler
    set.add(anyHandler)
    return () =>
      set.delete(anyHandler)
  }

  const base: Gateway = {
    getSettings:  async () => DEFAULT_SETTINGS,
    saveSettings: async () => {},
    pickRoot:     async () => null,
    forgetRoots:  async () => ({ removed: 0 }),
    pageTracks:   async () => ({ tracks: [], total: 0 }),
    scan:         async () => ({ scanId: 'stub-scan' }),
    cancelScan:   async () => {},
    patchTags:    async (id: string): Promise<TrackJSON> =>
      ({ id, path: id, title: '', artist: '', album: '', duration: 0, format: '', size: 0, coverColor: '#000', mtimeMs: 0 }),
    listPlaylists:   async () => [],
    savePlaylist:    async () => {},
    deletePlaylist:  async () => {},
    getAnalysis:     async () => null,
    putAnalysis:     async () => {},
    mediaOrigin:     async () => ({ origin: 'fake://', token: 't' }),
    showContextMenu: async () => {},
    windowCommand:   async () => {},
    openShell:       async () => {},
    on,
    mediaUrl:        async id =>
      `fake://media/${id}`,
    artUrl: async id =>
      `fake://art/${id}`,
  }

  return {
    ...base,
    ...overrides,
    on,
    emit: (message, payload) => {
      const set = handlers.get(message)
      if (!set)
        return
      for (const handler of [ ...set ])
        handler(payload)
    },
  }
}

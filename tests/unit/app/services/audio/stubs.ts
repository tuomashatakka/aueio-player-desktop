/**
 * Minimal Web Audio + `<audio>` stubs shared by `engine.test.ts` and
 * `dsp-chain.test.ts`. Every node logs its `connect()` calls onto one shared
 * `edges` array (`fromKind -> toKind`) so a test can assert the graph's
 * wiring order without a real `AudioContext`.
 */

export interface StubParam {
  value: number
  setTargetAtTime (value: number, startTime: number, timeConstant: number): StubParam
}

export interface StubNode {
  readonly kind: string
  connect (target: StubNode): StubNode
  disconnect (): void
}

export interface StubBiquad extends StubNode {
  type:               BiquadFilterType
  readonly frequency: StubParam
  readonly Q:         StubParam
  readonly gain:      StubParam
}

export interface StubDynamics extends StubNode {
  readonly threshold: StubParam
  readonly knee:      StubParam
  readonly ratio:     StubParam
  readonly attack:    StubParam
  readonly release:   StubParam
  readonly reduction: number
}

export interface StubGain extends StubNode {
  readonly gain: StubParam
}

export interface StubAnalyser extends StubNode {
  fftSize:               number
  smoothingTimeConstant: number
}

export interface StubNodeLog {
  readonly sources:     StubNode[]
  readonly gains:       StubGain[]
  readonly biquads:     StubBiquad[]
  readonly compressors: StubDynamics[]
  readonly analysers:   StubAnalyser[]
}

export interface StubAudioElement {
  src:         string
  currentTime: number
  duration:    number
  crossOrigin: string | null
  preload:     string
  error:       { message: string } | null
  paused:      boolean
  addEventListener (type: string, listener: EventListener): void
  removeEventListener (type: string, listener: EventListener): void
  removeAttribute (name: string): void
  play (): Promise<void>
  pause (): void
  dispatch (type: string): void
}

function makeParam (value: number): StubParam {
  const param: StubParam = {
    value,
    setTargetAtTime (next) {
      param.value = next
      return param
    },
  }
  return param
}

export function createStubGraph () {
  const edges: string[] = []
  let counter = 0

  const nodes: StubNodeLog = { sources: [], gains: [], biquads: [], compressors: [], analysers: []}

  function makeNode<T extends StubNode> (kind: string, extra: Omit<T, keyof StubNode>): T {
    const id   = `${kind}#${++counter}`
    const node = {
      kind: id,
      connect (target: StubNode) {
        edges.push(`${id} -> ${target.kind}`)
        return target
      },
      disconnect () {
        edges.push(`${id} -> (disconnected)`)
      },
      ...extra,
    } as T
    return node
  }

  const destination = makeNode<StubNode>('destination', {})

  const ctx = {
    sampleRate:  48000,
    currentTime: 0,
    state:       'suspended' as AudioContextState,
    destination,

    createMediaElementSource (_el: unknown) {
      const node = makeNode<StubNode>('source', {})
      nodes.sources.push(node)
      return node
    },

    createGain (): StubGain {
      const node = makeNode<StubGain>('gain', { gain: makeParam(1) })
      nodes.gains.push(node)
      return node
    },

    createBiquadFilter (): StubBiquad {
      const node = makeNode<StubBiquad>('biquad', {
        type:      'peaking',
        frequency: makeParam(0),
        Q:         makeParam(1),
        gain:      makeParam(0),
      })
      nodes.biquads.push(node)
      return node
    },

    createDynamicsCompressor (): StubDynamics {
      const node = makeNode<StubDynamics>('compressor', {
        threshold: makeParam(-24),
        knee:      makeParam(30),
        ratio:     makeParam(12),
        attack:    makeParam(0.003),
        release:   makeParam(0.25),
        reduction: 0,
      })
      nodes.compressors.push(node)
      return node
    },

    createAnalyser (): StubAnalyser {
      const node = makeNode<StubAnalyser>('analyser', { fftSize: 2048, smoothingTimeConstant: 0 })
      nodes.analysers.push(node)
      return node
    },

    resume () {
      ctx.state = 'running'
      return Promise.resolve()
    },

    close () {
      return Promise.resolve()
    },
  }

  return { ctx, edges, nodes }
}

export function createStubAudioElement (): StubAudioElement {
  const listeners = new Map<string, Set<EventListener>>()

  const el: StubAudioElement = {
    src:         '',
    currentTime: 0,
    duration:    0,
    crossOrigin: null,
    preload:     '',
    error:       null,
    paused:      true,

    addEventListener (type, listener) {
      const set = listeners.get(type) ?? new Set()
      set.add(listener)
      listeners.set(type, set)
    },

    removeEventListener (type, listener) {
      listeners.get(type)?.delete(listener)
    },

    removeAttribute () {},

    play () {
      el.paused = false
      el.dispatch('playing')
      return Promise.resolve()
    },

    pause () {
      el.paused = true
      el.dispatch('pause')
    },

    dispatch (type) {
      for (const listener of listeners.get(type) ?? [])
        (listener as (event: Event) => void)({ type } as Event)
    },
  }

  return el
}

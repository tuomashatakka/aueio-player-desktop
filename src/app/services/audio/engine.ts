/**
 * The playback graph: one `HTMLAudioElement`, one `AudioContext`, one
 * `dspChain`, one analyser. See §8 — volume lives on a `GainNode` after the
 * DSP chain (not on the element), which is what fixes desktop-audio's
 * documented compressor/limiter-vs-volume interaction.
 *
 * ```
 * <audio> -> MediaElementSource -> dspChain.input
 * dspChain.output -> GainNode (volume) -> AnalyserNode -> destination
 * ```
 *
 * Nothing is constructed until {@link AudioEngine.load} is called the first
 * time — no `AudioContext`, no `<audio>`, no graph — so building an engine
 * that never plays never touches autoplay policy or allocates a context.
 */
import { createDspChain } from './dspChain'
import type { DspChain } from './dspChain'
import type { DspJSON } from '../../../shared/dto'


/** `time` is throttled to this many notifications a second — the seek bar animates via CSS between them. */
const TIME_HZ          = 4
const TIME_INTERVAL_MS = 1000 / TIME_HZ

const FFT_SIZE  = 4096
const SMOOTHING = 0.8

/** Payload type per event name — `void` events still take a listener with no argument. */
export interface AudioEngineEvents {
  loading:  undefined
  playing:  undefined
  paused:   undefined
  ended:    undefined
  error:    Error
  time:     number
  duration: number
}

export type AudioEngineEvent = keyof AudioEngineEvents

/**
 * Unsubscribes a listener registered with {@link AudioEngine.on}. Not
 * exported from `services/index.ts` — `gateway/Gateway.ts` exports the same
 * shape under the same name, and a wildcard barrel export cannot carry two.
 */
type Dispose = () => void

export interface AudioEngineDeps {
  AudioContext?:  new () => AudioContext
  createElement?: () => HTMLAudioElement
}

export interface AudioEngine {
  load (url: string): void
  play (): Promise<void>
  pause (): void
  seek (seconds: number): void
  setVolume (volume: number): void
  applyDsp (dsp: DspJSON): void

  /** Resumes a suspended `AudioContext` — call from the handler of the gesture that starts playback. */
  resume (): Promise<void>

  dispose (): void

  readonly analyser:    AnalyserNode | null
  readonly currentTime: number
  readonly duration:    number

  on<E extends AudioEngineEvent> (event: E, listener: (payload: AudioEngineEvents[E]) => void): Dispose
}

interface Graph {
  readonly ctx:      AudioContext
  readonly audio:    HTMLAudioElement
  readonly source:   MediaElementAudioSourceNode
  readonly dsp:      DspChain
  readonly gain:     GainNode
  readonly analyser: AnalyserNode
  readonly teardown: () => void
}

// A `Map` keyed by event name, rather than an object indexed by the generic
// `E`, sidesteps TypeScript's inability to prove a fresh `Set<(payload:
// AudioEngineEvents[E]) => void>` matches a homomorphic mapped type indexed
// by that same generic — the listener is cast once, at the one point it
// crosses from "this specific event's payload" to "some event's payload".
type AnyListener = (payload: unknown) => void

export function createAudioEngine (deps: AudioEngineDeps = {}): AudioEngine {
  const handlers = new Map<AudioEngineEvent, Set<AnyListener>>()
  let graph: Graph | null = null
  let lastTimeEmit        = 0

  function emit<E extends AudioEngineEvent> (event: E, payload: AudioEngineEvents[E]): void {
    const set = handlers.get(event)
    if (!set)
      return
    for (const listener of set)
      listener(payload)
  }

  function ensureGraph (): Graph {
    if (graph)
      return graph

    const Ctor  = deps.AudioContext ?? AudioContext
    const ctx   = new Ctor()
    const audio = deps.createElement?.() ?? new Audio()

    audio.crossOrigin = 'anonymous'
    audio.preload     = 'metadata'

    const source   = ctx.createMediaElementSource(audio)
    const dsp      = createDspChain(ctx)
    const gain     = ctx.createGain()
    const analyser = ctx.createAnalyser()

    analyser.fftSize               = FFT_SIZE
    analyser.smoothingTimeConstant = SMOOTHING

    source.connect(dsp.input)
    dsp.output.connect(gain)
    gain.connect(analyser)
    analyser.connect(ctx.destination)

    const onLoadStart = () =>
      emit('loading', undefined)
    const onPlaying = () =>
      emit('playing', undefined)
    const onPause = () =>
      emit('paused', undefined)
    const onEnded = () =>
      emit('ended', undefined)
    const onError = () =>
      emit('error', new Error(audio.error?.message ?? 'audio element error'))
    const onDurationChange = () =>
      emit('duration', audio.duration)
    const onTimeUpdate = () => {
      const now = Date.now()
      if (now - lastTimeEmit < TIME_INTERVAL_MS)
        return
      lastTimeEmit = now
      emit('time', audio.currentTime)
    }

    audio.addEventListener('loadstart', onLoadStart)
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('timeupdate', onTimeUpdate)

    graph = {
      ctx,
      audio,
      source,
      dsp,
      gain,
      analyser,
      teardown: () => {
        audio.removeEventListener('loadstart', onLoadStart)
        audio.removeEventListener('playing', onPlaying)
        audio.removeEventListener('pause', onPause)
        audio.removeEventListener('ended', onEnded)
        audio.removeEventListener('error', onError)
        audio.removeEventListener('durationchange', onDurationChange)
        audio.removeEventListener('timeupdate', onTimeUpdate)
      },
    }

    return graph
  }

  return {
    load (url) {
      const g     = ensureGraph()
      g.audio.src = url
    },

    async play () {
      if (!graph)
        return
      await graph.ctx.resume()
      await graph.audio.play()
    },

    pause () {
      graph?.audio.pause()
    },

    seek (seconds) {
      if (graph)
        graph.audio.currentTime = seconds
    },

    setVolume (volume) {
      if (graph)
        graph.gain.gain.value = Math.min(1, Math.max(0, volume))
    },

    applyDsp (dsp) {
      graph?.dsp.apply(dsp)
    },

    async resume () {
      if (graph && graph.ctx.state === 'suspended')
        await graph.ctx.resume()
    },

    dispose () {
      if (!graph)
        return
      graph.teardown()
      graph.dsp.dispose()
      graph.source.disconnect()
      graph.gain.disconnect()
      graph.analyser.disconnect()
      graph.audio.pause()
      graph.audio.removeAttribute('src')
      graph = null
    },

    get analyser () {
      return graph?.analyser ?? null
    },

    get currentTime () {
      return graph?.audio.currentTime ?? 0
    },

    get duration () {
      return graph?.audio.duration ?? 0
    },

    on (event, listener) {
      const set = handlers.get(event) ?? new Set<AnyListener>()
      handlers.set(event, set)

      const anyListener = listener as AnyListener
      set.add(anyListener)
      return () =>
        set.delete(anyListener)
    },
  }
}

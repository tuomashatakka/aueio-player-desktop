/**
 * AudioEngine – singleton class managing the Web Audio API lifecycle.
 * This is the one place in the app where a class is justified:
 * browser audio context requires careful lifecycle management and
 * must not be instantiated multiple times.
 */
export class AudioEngine {
  // eslint-disable-next-line functional/prefer-readonly-type
  static #instance: AudioEngine | null = null

  static getInstance (): AudioEngine {
    if (!AudioEngine.#instance)
      AudioEngine.#instance = new AudioEngine()

    return AudioEngine.#instance
  }

  readonly #audioEl: HTMLAudioElement
  // eslint-disable-next-line functional/prefer-readonly-type
  #ctx:              AudioContext | null = null
  // eslint-disable-next-line functional/prefer-readonly-type
  #analyser:         AnalyserNode | null = null
  // eslint-disable-next-line functional/prefer-readonly-type
  #source:           MediaElementAudioSourceNode | null = null

  private constructor () {
    this.#audioEl = new Audio()
    this.#audioEl.preload = 'metadata'
  }

  // ─── Context init ─────────────────────────────────────────────

  ensureContext (): void {
    if (this.#ctx)
      return

    this.#ctx = new AudioContext()
    this.#analyser = this.#ctx.createAnalyser()
    this.#analyser.fftSize = 256
    this.#source = this.#ctx.createMediaElementSource(this.#audioEl)
    this.#source.connect(this.#analyser)
    this.#analyser.connect(this.#ctx.destination)
  }

  get audioContext (): AudioContext | null {
    return this.#ctx
  }

  get analyserNode (): AnalyserNode | null {
    return this.#analyser
  }

  // ─── Playback control ─────────────────────────────────────────

  async play (url: string): Promise<void> {
    this.ensureContext()
    this.#audioEl.src = url
    this.#audioEl.currentTime = 0
    await this.#audioEl.play()
  }

  pause (): void {
    this.#audioEl.pause()
  }

  async resume (): Promise<void> {
    await this.#ctx?.resume()
    await this.#audioEl.play()
  }

  seek (time: number): void {
    this.#audioEl.currentTime = time
  }

  setVolume (vol: number): void {
    this.#audioEl.volume = vol
  }

  // ─── State accessors ──────────────────────────────────────────

  get currentTime (): number {
    return this.#audioEl.currentTime
  }

  get duration (): number {
    return this.#audioEl.duration || 0
  }

  get isPlaying (): boolean {
    return !this.#audioEl.paused
  }

  get audioElement (): HTMLAudioElement {
    return this.#audioEl
  }

  // ─── Event subscriptions (return cleanup fn) ──────────────────

  onTimeUpdate (cb: (currentTime: number, duration: number) => void): () => void {
    const handler = () =>
      cb(this.#audioEl.currentTime, this.#audioEl.duration || 0)
    this.#audioEl.addEventListener('timeupdate', handler)
    return () => {
      this.#audioEl.removeEventListener('timeupdate', handler)
    }
  }

  onEnded (cb: () => void): () => void {
    this.#audioEl.addEventListener('ended', cb)
    return () => {
      this.#audioEl.removeEventListener('ended', cb)
    }
  }

  onError (cb: (e: Event) => void): () => void {
    this.#audioEl.addEventListener('error', cb)
    return () => {
      this.#audioEl.removeEventListener('error', cb)
    }
  }

  onLoadedMetadata (cb: (duration: number) => void): () => void {
    const handler = () =>
      cb(this.#audioEl.duration || 0)
    this.#audioEl.addEventListener('loadedmetadata', handler)
    return () => {
      this.#audioEl.removeEventListener('loadedmetadata', handler)
    }
  }
}

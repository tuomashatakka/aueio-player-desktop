/**
 * The processing chain between the media source and the analyser.
 *
 * Ported from `desktop-audio/src/app/services/dspChain.ts`, cut to the ten
 * ISO 1/3-octave bands §8/§14 keep (the sixteen-band graphic EQ and the
 * separate compressor module are dropped; the limiter's ratio/knee/attack are
 * welded constants rather than user settings, matching `DspJSON`).
 *
 * **The graph is built once and never re-plumbed. Bypass is neutral
 * parameters, not disconnection** — a `peaking`/`lowshelf`/`highshelf` biquad
 * at 0 dB is exactly unity, and a `DynamicsCompressorNode` at `ratio 1,
 * threshold 0, knee 0` reduces by 0 dB on every sample, so there is nothing to
 * gain (and a click to lose) by splicing nodes in or out live.
 */
import type { DspJSON } from '../../../shared/dto'


/**
 * The ten bands, low to high — the ISO preferred series from 31.5 Hz to
 * 16 kHz, with the two edges as shelves rather than peaks so the fader at
 * either end actually reaches "everything below/above here" instead of a
 * narrow peak near the edge of hearing.
 */
export const EQ_BANDS: readonly EqBand[] = [
  { label: '31', hz: 31.5, type: 'lowshelf' },
  { label: '63', hz: 63, type: 'peaking' },
  { label: '125', hz: 125, type: 'peaking' },
  { label: '250', hz: 250, type: 'peaking' },
  { label: '500', hz: 500, type: 'peaking' },
  { label: '1k', hz: 1000, type: 'peaking' },
  { label: '2k', hz: 2000, type: 'peaking' },
  { label: '4k', hz: 4000, type: 'peaking' },
  { label: '8k', hz: 8000, type: 'peaking' },
  { label: '16k', hz: 16000, type: 'highshelf' },
]

/** Filter width, shared by every peaking band; ignored on the two shelves. */
export const BAND_Q = 1.4

/** Faders travel +-this many dB. */
export const EQ_GAIN_LIMIT = 12

/** Seconds. How fast a parameter glides to a new value — never a hard jump on a live graph. */
export const PARAM_GLIDE = 0.01

/** How close to Nyquist a band centre may sit; the *label* never changes, only the coefficient is clamped. */
const NYQUIST_MARGIN = 0.45

/** A limiter is a compressor with the knobs welded down. */
const LIMITER_RATIO  = 20
const LIMITER_KNEE   = 0
const LIMITER_ATTACK = 0.001

/** A module doing nothing at all: unity gain on every sample. */
const NEUTRAL_LIMITER: DynamicsNodeValues = {
  threshold: 0,
  knee:      0,
  ratio:     1,
  attack:    0.003,
  release:   0.25,
}

/** One band: what the label says, what the node gets, and how it filters. */
export interface EqBand {
  readonly label: string
  readonly hz:    number
  readonly type:  BiquadFilterType
}

/** What one `DynamicsCompressorNode` should be set to. Seconds, not milliseconds. */
export interface DynamicsNodeValues {
  readonly threshold: number
  readonly knee:      number
  readonly ratio:     number
  readonly attack:    number
  readonly release:   number
}

/** `DspJSON` resolved to what the nodes actually get, bypass included. */
export interface DspNodeValues {
  readonly eqGains: readonly number[]
  readonly limiter: DynamicsNodeValues
}

export interface DspChain {

  /** Connect the media source here. */
  readonly input: AudioNode

  /** Connect the analyser here. */
  readonly output: AudioNode

  /** Push settings onto the nodes. Idempotent, and diffed, so a drag is cheap. */
  apply (dsp: DspJSON): void
  dispose (): void
}

function clamp (value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Resolve `DspJSON` to node values — the only place milliseconds become
 * seconds, and the only place "off" becomes a set of numbers. Pure, so the
 * bypass semantics are testable without an audio context anywhere near them.
 */
export function dspNodeValues (dsp: DspJSON): DspNodeValues {
  return {
    eqGains: EQ_BANDS.map((_, index) =>
      dsp.eq.on ? clamp(dsp.eq.gains[index] ?? 0, -EQ_GAIN_LIMIT, EQ_GAIN_LIMIT) : 0),

    limiter: dsp.limiter.on
      ? {
        threshold: dsp.limiter.threshold,
        knee:      LIMITER_KNEE,
        ratio:     LIMITER_RATIO,
        attack:    LIMITER_ATTACK,
        release:   dsp.limiter.release / 1000,
      }
      : NEUTRAL_LIMITER,
  }
}

/** See module docstring. */
export function createDspChain (ctx: BaseAudioContext): DspChain {
  const input   = ctx.createGain()
  const output  = ctx.createGain()
  const ceiling = ctx.sampleRate * NYQUIST_MARGIN

  const bands = EQ_BANDS.map(band => {
    const filter           = ctx.createBiquadFilter()
    filter.type            = band.type
    filter.frequency.value = Math.min(band.hz, ceiling)
    filter.gain.value      = 0

    // Not on the shelves: the spec ignores Q there.
    if (band.type === 'peaking')
      filter.Q.value = BAND_Q

    return filter
  })

  const limiter = ctx.createDynamicsCompressor()

  // Wired once, here, and never touched again.
  let node: AudioNode = input
  for (const filter of bands) {
    node.connect(filter)
    node = filter
  }
  node.connect(limiter)
  limiter.connect(output)

  /** The last values written, so a drag does not re-schedule what has not moved. */
  let applied: DspNodeValues | null = null

  function glide (param: AudioParam, value: number, now: number): void {
    // Never `param.value = ...` on a live graph: a dragged fader zippers audibly.
    param.setTargetAtTime(value, now, PARAM_GLIDE)
  }

  function applyLimiter (next: DynamicsNodeValues, previous: DynamicsNodeValues | undefined, now: number): void {
    if (previous?.threshold !== next.threshold)
      glide(limiter.threshold, next.threshold, now)
    if (previous?.knee !== next.knee)
      glide(limiter.knee, next.knee, now)
    if (previous?.ratio !== next.ratio)
      glide(limiter.ratio, next.ratio, now)
    if (previous?.attack !== next.attack)
      glide(limiter.attack, next.attack, now)
    if (previous?.release !== next.release)
      glide(limiter.release, next.release, now)
  }

  return {
    input,
    output,

    apply (dsp) {
      const next = dspNodeValues(dsp)
      const now  = ctx.currentTime

      for (const [ index, filter ] of bands.entries())
        if (applied?.eqGains[index] !== next.eqGains[index])
          glide(filter.gain, next.eqGains[index] ?? 0, now)

      applyLimiter(next.limiter, applied?.limiter, now)

      applied = next
    },

    dispose () {
      input.disconnect()
      for (const filter of bands)
        filter.disconnect()
      limiter.disconnect()
      output.disconnect()
      applied = null
    },
  }
}

import { describe, expect, test } from 'bun:test'
import { createDspChain, dspNodeValues, EQ_BANDS } from '../../../../../src/app/services/audio/dspChain'
import type { DspJSON } from '../../../../../src/shared/dto'
import { createStubGraph } from './stubs'


const NEUTRAL: DspJSON = {
  eq:      { on: false, gains: EQ_BANDS.map(() => 3) }, // non-zero gains, but eq is off
  limiter: { on: false, threshold: -6, release: 50 },
}

describe('dspNodeValues', () => {
  test('bypass is neutral parameters: eq off zeroes every band, limiter off is unity', () => {
    const values = dspNodeValues(NEUTRAL)

    expect(values.eqGains).toEqual(EQ_BANDS.map(() =>
      0))
    expect(values.limiter).toEqual({ threshold: 0, knee: 0, ratio: 1, attack: 0.003, release: 0.25 })
  })

  test('enabled settings pass through (ms -> s for the limiter release)', () => {
    const dsp: DspJSON = {
      eq:      { on: true, gains: EQ_BANDS.map((_, i) => i) },
      limiter: { on: true, threshold: -3, release: 200 },
    }
    const values = dspNodeValues(dsp)

    expect(values.eqGains).toEqual(EQ_BANDS.map((_, i) =>
      i))
    expect(values.limiter).toEqual({ threshold: -3, knee: 0, ratio: 20, attack: 0.001, release: 0.2 })
  })

  test('eq gains are clamped to +-12 dB', () => {
    const dsp: DspJSON = {
      eq:      { on: true, gains: EQ_BANDS.map(() => 99) },
      limiter: { on: false, threshold: -1, release: 100 },
    }
    expect(dspNodeValues(dsp).eqGains).toEqual(EQ_BANDS.map(() =>
      12))
  })
})

describe('createDspChain', () => {
  test('wires input -> ten bands in series -> limiter -> output, once', () => {
    const { ctx, edges } = createStubGraph()
    createDspChain(ctx as unknown as BaseAudioContext)

    expect(edges).toHaveLength(EQ_BANDS.length + 2)
    expect(edges[0]).toMatch(/^gain#\d+ -> biquad#\d+$/)
    expect(edges.at(-1)).toMatch(/^compressor#\d+ -> gain#\d+$/)
  })

  test('apply() never disconnects the graph — bypass writes neutral params instead', () => {
    const { ctx, edges }      = createStubGraph()
    const chain               = createDspChain(ctx as unknown as BaseAudioContext)
    const edgeCountAfterBuild = edges.length

    chain.apply(NEUTRAL)
    chain.apply({ eq: { on: true, gains: EQ_BANDS.map(() => 4) }, limiter: { on: true, threshold: -2, release: 80 }})

    expect(edges).toHaveLength(edgeCountAfterBuild)
    expect(edges.some(e =>
      e.includes('disconnected'))).toBe(false)
  })

  test('dispose() disconnects every node exactly once', () => {
    const { ctx, edges }      = createStubGraph()
    const chain               = createDspChain(ctx as unknown as BaseAudioContext)
    const edgeCountAfterBuild = edges.length

    chain.dispose()

    const disconnects = edges.slice(edgeCountAfterBuild).filter(e =>
      e.includes('disconnected'))
    // input + 10 bands + limiter + output = 13 nodes.
    expect(disconnects).toHaveLength(EQ_BANDS.length + 3)
  })
})

import { describe, expect, test } from 'bun:test'
import { axisFrequency, axisPosition, eqResponseDb } from '../../../../../src/app/services/audio/eqResponse'
import { EQ_BANDS } from '../../../../../src/app/services/audio/dspChain'


describe('eqResponseDb', () => {
  test('is flat (0 dB) everywhere at zero gains', () => {
    const hz  = [ 20, 100, 1000, 10000, 20000 ]
    const out = eqResponseDb(EQ_BANDS.map(() =>
      0), hz)

    for (const value of out)
      expect(value).toBeCloseTo(0, 5)
  })

  test('reads ~+6 dB right at a boosted peaking band\'s own centre frequency', () => {
    const index = EQ_BANDS.findIndex(b =>
      b.hz === 1000)
    const gains = EQ_BANDS.map((_, i) =>
      i === index ? 6 : 0)

    const out = eqResponseDb(gains, [ 1000 ])
    expect(out[0]).toBeCloseTo(6, 1)
  })

  test('a lowshelf boost reaches full gain well below its corner', () => {
    const index = EQ_BANDS.findIndex(b =>
      b.type === 'lowshelf')
    const gains = EQ_BANDS.map((_, i) =>
      i === index ? 6 : 0)

    const out = eqResponseDb(gains, [ 20 ])
    expect(out[0]).toBeGreaterThan(5)
  })
})

describe('axisPosition / axisFrequency', () => {
  test('round-trip and bracket the log axis at 0 and 1', () => {
    const min = 20
    const max = 20000

    expect(axisPosition(min, min, max)).toBeCloseTo(0, 10)
    expect(axisPosition(max, min, max)).toBeCloseTo(1, 10)

    for (const hz of [ 100, 1000, 5000 ]) {
      const pos = axisPosition(hz, min, max)
      expect(axisFrequency(pos, min, max)).toBeCloseTo(hz, 6)
    }
  })
})

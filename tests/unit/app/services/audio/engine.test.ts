import { describe, expect, test } from 'bun:test'
import { createAudioEngine } from '../../../../../src/app/services/audio/engine'
import { createStubAudioElement, createStubGraph } from './stubs'
import type { StubAudioElement } from './stubs'


function setup () {
  const { ctx, edges, nodes }        = createStubGraph()
  const elements: StubAudioElement[] = []

  class StubAudioContextCtor {
    constructor () {
      return ctx as unknown as StubAudioContextCtor
    }
  }

  const engine = createAudioEngine({
    AudioContext:  StubAudioContextCtor as unknown as new () => AudioContext,
    createElement: () => {
      const el = createStubAudioElement()
      elements.push(el)
      return el as unknown as HTMLAudioElement
    },
  })

  return { engine, ctx, edges, nodes, elements }
}

describe('createAudioEngine', () => {
  test('constructs nothing until load() is called', () => {
    const { engine, edges, elements } = setup()

    expect(edges).toHaveLength(0)
    expect(elements).toHaveLength(0)
    expect(engine.analyser).toBeNull()
    expect(engine.currentTime).toBe(0)
    expect(engine.duration).toBe(0)
  })

  test('load() wires <audio> -> dspChain -> volume gain -> analyser -> destination, in order', () => {
    const { engine, edges, nodes } = setup()
    engine.load('fake://media/track.wav')

    // dspChain wires its own internal chain (input -> ...bands... -> limiter
    // -> output) while it is constructed, before engine.ts ever calls
    // `source.connect(dsp.input)` — so that connection, not `edges[0]`, is
    // the one that proves the <audio> source feeds the DSP chain.
    expect(nodes.sources).toHaveLength(1)
    expect(nodes.gains).toHaveLength(3) // dspChain's input, dspChain's output, and volume.

    const [ dspInput, dspOutput, volumeGain ] = nodes.gains as [ typeof nodes.gains[0], typeof nodes.gains[0], typeof nodes.gains[0] ]

    expect(edges).toContain(`${nodes.sources[0]!.kind} -> ${dspInput.kind}`)
    expect(edges).toContain(`${dspOutput.kind} -> ${volumeGain.kind}`)
    expect(edges.at(-1)).toMatch(/^analyser#\d+ -> destination#\d+$/)

    expect(volumeGain.gain.value).toBe(1)

    expect(nodes.analysers).toHaveLength(1)
    expect(nodes.analysers[0]!.fftSize).toBe(4096)
    expect(nodes.analysers[0]!.smoothingTimeConstant).toBe(0.8)
  })

  test('setVolume writes the gain node between the DSP chain and the analyser, not the element', () => {
    const { engine, nodes } = setup()
    engine.load('fake://media/track.wav')
    engine.setVolume(0.25)

    expect(nodes.gains[2]!.gain.value).toBe(0.25)
    expect(nodes.gains[2]!.gain.value).not.toBe(nodes.gains[0]!.gain.value)
  })

  test('time is throttled to at most 4 notifications a second', () => {
    const { engine, elements } = setup()
    engine.load('fake://media/track.wav')

    const times: number[] = []
    engine.on('time', t =>
      times.push(t))

    const originalNow = Date.now
    let now = 1_000_000

    try {
      Date.now = () =>
        now

      const el       = elements[0]!
      el.currentTime = 1
      el.dispatch('timeupdate')
      el.currentTime = 1.01
      el.dispatch('timeupdate')
      el.currentTime = 1.02
      el.dispatch('timeupdate')
      expect(times).toEqual([ 1 ])

      now += 260 // past the 250 ms (4 Hz) interval
      el.currentTime = 2
      el.dispatch('timeupdate')
      expect(times).toEqual([ 1, 2 ])
    }
    finally {
      Date.now = originalNow
    }
  })

  test('play()/pause() drive the <audio> element and resume a suspended context', async () => {
    const { engine, ctx, elements } = setup()
    engine.load('fake://media/track.wav')

    expect(ctx.state).toBe('suspended')
    await engine.play()
    expect(ctx.state).toBe('running')
    expect(elements[0]!.paused).toBe(false)

    engine.pause()
    expect(elements[0]!.paused).toBe(true)
  })

  test('dispose() tears down listeners and the graph, and getters reset to defaults', () => {
    const { engine, edges } = setup()
    engine.load('fake://media/track.wav')

    const edgeCountAfterLoad = edges.length

    engine.dispose()

    expect(edges.length).toBeGreaterThan(edgeCountAfterLoad)
    expect(engine.analyser).toBeNull()
    expect(engine.currentTime).toBe(0)
    expect(engine.duration).toBe(0)
  })
})

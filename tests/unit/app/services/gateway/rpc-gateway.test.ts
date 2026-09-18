/**
 * `RpcGateway` against a mocked `electrobun/view`. The real module cannot be
 * resolved in this sandbox outside the Hutch devkit (see
 * `src/types/electrobun.d.ts`'s docstring), so `mock.module` replaces it
 * before `RpcGateway` is ever imported — this file, and only this file,
 * touches `electrobun/view`.
 */
import { describe, expect, mock, test } from 'bun:test'


let captured: CapturedConfig | null = null

type RequestHandlers = Record<string, (params: unknown) => unknown>
type MessageHandlers = Record<string, (payload: unknown) => void>

interface CapturedConfig {
  readonly maxRequestTime?: number
  readonly handlers: {
    readonly requests?: RequestHandlers
    readonly messages?: MessageHandlers
  }
}

mock.module('electrobun/view', () => {
  class FakeElectroview {
    static defineRPC (config: CapturedConfig) {
      captured = config

      const request = new Proxy({}, {
        get: (_target, name: string) =>
          (params: unknown) => {
            if (name === 'media.origin')
              return Promise.resolve({ origin: 'http://127.0.0.1:4173', token: 'tok' })
            return Promise.resolve({ echoed: name, params })
          },
      }) as RequestHandlers

      return { request, send: {}}
    }
  }

  return { Electroview: FakeElectroview }
})

// eslint-disable-next-line ordered/top-level-definitions -- must import after mock.module registers the fake electrobun/view above; the real module throws on import outside the Hutch devkit.
const { RpcGateway } = await import('../../../../../src/app/services/gateway/RpcGateway')

describe('RpcGateway', () => {
  test('defines the RPC once, with every streamed message wired to a fan-out handler', () => {
    new RpcGateway()

    expect(captured).not.toBeNull()
    expect(captured?.maxRequestTime).toBe(30_000)
    expect(Object.keys(captured?.handlers.messages ?? {}).sort()).toEqual([
      'media.command', 'menu.action', 'scan.batch', 'scan.done', 'scan.error', 'scan.progress',
    ])
  })

  test('forwards each method to its own named request', async () => {
    const gateway = new RpcGateway()

    // The fake `request` echoes back `{ echoed, params }` regardless of the
    // real response shape — cast each call to `unknown` to check that echo
    // rather than the (irrelevant here) real response type.
    const echo = <T> (promise: Promise<T>): Promise<unknown> =>
      promise as unknown as Promise<unknown>

    await expect(echo(gateway.getSettings())).resolves.toEqual({ echoed: 'settings.get', params: undefined })
    await expect(echo(gateway.pickRoot())).resolves.toEqual({ echoed: 'roots.pick', params: undefined })
    await expect(echo(gateway.scan([ '/music' ]))).resolves.toEqual({ echoed: 'library.scan', params: { roots: [ '/music' ]}})
    await expect(echo(gateway.patchTags('id', { title: 'New' })))
      .resolves.toEqual({ echoed: 'track.patchTags', params: { id: 'id', patch: { title: 'New' }}})
  })

  test('fans a streamed message out to every subscriber, and dispose only removes its own', () => {
    const gateway = new RpcGateway()

    const receivedA: unknown[] = []
    const receivedB: unknown[] = []
    const disposeA             = gateway.on('scan.batch', payload =>
      receivedA.push(payload))
    gateway.on('scan.batch', payload =>
      receivedB.push(payload))

    const messages = captured?.handlers.messages
    messages?.['scan.batch']?.({ scanId: 's1', tracks: []})
    expect(receivedA).toHaveLength(1)
    expect(receivedB).toHaveLength(1)

    disposeA()
    messages?.['scan.batch']?.({ scanId: 's1', tracks: []})
    expect(receivedA).toHaveLength(1)
    expect(receivedB).toHaveLength(2)
  })

  test('mediaUrl and artUrl build off mediaOrigin, id percent-encoded', async () => {
    const gateway = new RpcGateway()

    await expect(gateway.mediaUrl('a/b c.mp3'))
      .resolves.toBe('http://127.0.0.1:4173/media/a%2Fb%20c.mp3?t=tok')
    await expect(gateway.artUrl('deadbeef'))
      .resolves.toBe('http://127.0.0.1:4173/art/deadbeef?t=tok')
  })
})

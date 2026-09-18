import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { startMediaServer } from '../../../../src/main/media/server'
import type { MediaServer, ResolvedArt } from '../../../../src/main/media/server'


const FILE_CONTENTS    = 'x'.repeat(1000)
const ART_BYTES        = new Uint8Array([ 1, 2, 3, 4, 5, 6, 7, 8 ])
const ART: ResolvedArt = { mime: 'image/png', bytes: ART_BYTES }

let dir:     string
let filePath: string
let server:  MediaServer

beforeAll(async () => {
  dir      = await mkdtemp(path.join(tmpdir(), 'aueio-media-'))
  filePath = path.join(dir, 'track.wav')
  await writeFile(filePath, FILE_CONTENTS)

  server = startMediaServer({
    resolvePath: id =>
      id === 'known' ? filePath : null,
    resolveArt: id =>
      id === 'art-known' ? ART : null,
  })
})

afterAll(async () => {
  server.stop()
  await rm(dir, { recursive: true, force: true })
})

function url (route: string, token = server.token): string {
  return `${server.origin}${route}?t=${token}`
}

describe('media server', () => {
  test('serves the full file with 200 when no Range is sent', async () => {
    const res = await fetch(url('/media/known'))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Length')).toBe(String(FILE_CONTENTS.length))
    expect(await res.text()).toBe(FILE_CONTENTS)
  })

  test('serves a byte range with 206 and Content-Range', async () => {
    const res = await fetch(url('/media/known'), { headers: { Range: 'bytes=0-9' }})

    expect(res.status).toBe(206)
    expect(res.headers.get('Content-Range')).toBe(`bytes 0-9/${FILE_CONTENTS.length}`)
    expect(await res.text()).toBe(FILE_CONTENTS.slice(0, 10))
  })

  test('responds 416 for an out-of-range request', async () => {
    const res = await fetch(url('/media/known'), { headers: { Range: 'bytes=99999-' }})

    expect(res.status).toBe(416)
    expect(res.headers.get('Content-Range')).toBe(`bytes */${FILE_CONTENTS.length}`)
  })

  test('responds 404 for an id the resolver does not know', async () => {
    const res = await fetch(url('/media/unknown'))

    expect(res.status).toBe(404)
  })

  test('responds 403 for a bad token', async () => {
    const res = await fetch(url('/media/known', 'wrong-token'))

    expect(res.status).toBe(403)
  })

  test('serves art with a long-lived immutable cache header', async () => {
    const res = await fetch(url('/art/art-known'))

    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('private, max-age=31536000, immutable')
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(ART_BYTES)
  })

  test('responds 404 for an unknown art id', async () => {
    const res = await fetch(url('/art/unknown'))

    expect(res.status).toBe(404)
  })
})

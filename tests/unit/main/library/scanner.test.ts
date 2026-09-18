import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { getParseFileCallCount, resetParseFileCallCount } from '../../../../src/main/library/metadata'
import { scanRoots } from '../../../../src/main/library/scanner.worker'
import type { TrackJSON } from '../../../../src/shared/dto'


const FIXTURES = path.join(import.meta.dir, '..', '..', '..', 'fixtures')

let dir:    string
let dbPath: string

beforeEach(async () => {
  dir    = await mkdtemp(path.join(tmpdir(), 'aueio-scanner-'))
  dbPath = path.join(dir, 'library.db')
  resetParseFileCallCount()
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const noop = () => {}

describe('scanRoots', () => {
  test('walks the fixtures directory, parsing and upserting every audio file', async () => {
    const batches: TrackJSON[] = []
    const result               = await scanRoots([ FIXTURES ], dbPath, {
      onBatch: tracks =>
        batches.push(...tracks),
      onProgress: noop,
    })

    expect(result.total).toBe(3)
    expect(result.parsed).toBe(3)
    expect(result.pruned).toEqual([])
    expect(batches).toHaveLength(3)
    expect(getParseFileCallCount()).toBe(3)

    const byName = new Map(batches.map(track =>
      [ path.basename(track.path), track ]))
    expect(byName.get('tagged.mp3')?.title).toBe('Fixture Song')
    expect(byName.get('sine-a440.wav')?.duration).toBeCloseTo(2, 0)
  })

  test('rescanning an unchanged directory reports 0 newly parsed files', async () => {
    await scanRoots([ FIXTURES ], dbPath, { onBatch: noop, onProgress: noop })
    resetParseFileCallCount()

    const result = await scanRoots([ FIXTURES ], dbPath, { onBatch: noop, onProgress: noop })

    expect(result.total).toBe(3)
    expect(result.parsed).toBe(0)
    expect(result.pruned).toEqual([])
    expect(getParseFileCallCount()).toBe(0)
  })

  test('a scan that is already cancelled walks nothing', async () => {
    const result = await scanRoots([ FIXTURES ], dbPath, { onBatch: noop, onProgress: noop }, () =>
      true)

    expect(result.total).toBe(0)
    expect(getParseFileCallCount()).toBe(0)
  })
})

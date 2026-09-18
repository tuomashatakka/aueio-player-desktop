import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { readTrack } from '../../../../src/main/library/metadata'


const FIXTURES = path.join(import.meta.dir, '..', '..', '..', 'fixtures')

async function statOf (name: string) {
  const filePath = path.join(FIXTURES, name)
  const info     = await stat(filePath)
  return { filePath, stat: { size: info.size, mtimeMs: info.mtimeMs }}
}

describe('readTrack', () => {
  test('reads a fully tagged mp3', async () => {
    const { filePath, stat: fileStat } = await statOf('tagged.mp3')
    const { track, picture }           = await readTrack(filePath, fileStat)

    expect(track.title).toBe('Fixture Song')
    expect(track.artist).toBe('Fixture Artist')
    expect(track.album).toBe('Fixture Album')
    expect(track.year).toBe(2024)
    expect(track.trackNumber).toBe(3)
    expect(track.lyrics).toContain('line one')
    expect(track.duration).toBeGreaterThan(0)
    expect(picture).toBeDefined()
    expect(picture?.bytes.byteLength).toBeGreaterThan(0)
  })

  test('falls back to the filename when a wav carries no tags', async () => {
    const { filePath, stat: fileStat } = await statOf('sine-a440.wav')
    const { track, picture }           = await readTrack(filePath, fileStat)

    expect(track.title).toBe('sine-a440')
    expect(track.duration).toBeCloseTo(2, 0)
    expect(picture).toBeUndefined()
  })

  describe('unparseable file', () => {
    let dir: string

    beforeEach(async () => {
      dir = await mkdtemp(path.join(tmpdir(), 'aueio-metadata-'))
    })

    afterEach(async () => {
      await rm(dir, { recursive: true, force: true })
    })

    test('falls back to artist/title parsed from "Artist - Title"', async () => {
      const filePath = path.join(dir, 'Some Artist - A Title.mp3')
      await writeFile(filePath, 'not actually an mp3')

      const { track, picture } = await readTrack(filePath, { size: 20, mtimeMs: 42 })

      expect(track.title).toBe('A Title')
      expect(track.artist).toBe('Some Artist')
      expect(track.duration).toBe(0)
      expect(track.size).toBe(20)
      expect(track.mtimeMs).toBe(42)
      expect(picture).toBeUndefined()
    })

    test('falls back to a leading track number and bracketed year', async () => {
      const filePath = path.join(dir, '03 A Title [2019].mp3')
      await writeFile(filePath, 'not actually an mp3')

      const { track } = await readTrack(filePath, { size: 20, mtimeMs: 42 })

      expect(track.trackNumber).toBe(3)
      expect(track.year).toBe(2019)
      expect(track.artist).toBe('Unknown Artist')
    })
  })
})

import { describe, expect, test } from 'bun:test'
import { DEFAULT_FAKE_TRACKS, FakeGateway } from '../../../../../src/app/services/gateway/FakeGateway'


describe('FakeGateway', () => {
  test('seeds three tracks mirroring tests/fixtures by default', async () => {
    const gateway = new FakeGateway()
    const page    = await gateway.pageTracks({ limit: 10 })

    expect(page.total).toBe(3)
    expect(page.tracks.map(t =>
      t.id).sort()).toEqual(DEFAULT_FAKE_TRACKS.map(t =>
      t.id).sort())
  })

  test('scan() emits scan.batch then scan.done asynchronously', async () => {
    const gateway          = new FakeGateway()
    const events: string[] = []

    gateway.on('scan.batch', () =>
      events.push('batch'))
    gateway.on('scan.done', () =>
      events.push('done'))

    const { scanId } = await gateway.scan([])
    expect(scanId).toMatch(/^fake-scan-/)

    // scan() schedules its emission with queueMicrotask rather than emitting
    // synchronously, so batch/done are not observable until the microtask
    // queue has drained — which `await`ing the scan() call itself already does.
    expect(events).toEqual([ 'batch', 'done' ])
  })

  test('settings, playlists and analysis round-trip through in-memory maps', async () => {
    const gateway = new FakeGateway()

    const settings = await gateway.getSettings()
    await gateway.saveSettings({ ...settings, volume: 0.4 })
    await expect(gateway.getSettings()).resolves.toMatchObject({ volume: 0.4 })

    await gateway.savePlaylist({ id: 'p1', name: 'Chill', icon: 'star', trackIds: []})
    await expect(gateway.listPlaylists()).resolves.toEqual([
      { id: 'p1', name: 'Chill', icon: 'star', trackIds: []},
    ])
    await gateway.deletePlaylist('p1')
    await expect(gateway.listPlaylists()).resolves.toEqual([])

    const analysis = { version: 1, duration: 4, tempo: { bpm: 120, confidence: 1 }, key: { tonic: 'A', scale: 'major' as const, label: 'A major', confidence: 1 }, chords: []}
    await gateway.putAnalysis('tests/fixtures/sine-a440.wav', 0, analysis)
    await expect(gateway.getAnalysis('tests/fixtures/sine-a440.wav', 0, 1)).resolves.toEqual(analysis)
    await expect(gateway.getAnalysis('tests/fixtures/sine-a440.wav', 0, 2)).resolves.toBeNull()
  })

  test('mediaUrl/artUrl use the fake origin', async () => {
    const gateway = new FakeGateway()
    await expect(gateway.mediaUrl('a b.mp3')).resolves.toBe('fake://media/a%20b.mp3')
    await expect(gateway.artUrl('art1')).resolves.toBe('fake://art/art1')
  })

  test('resolveMenu delivers menu.action for the most recently opened menu', async () => {
    const gateway                                                 = new FakeGateway()
    const received: { menuId: string, actionId: string | null }[] = []
    gateway.on('menu.action', payload =>
      received.push(payload))

    await gateway.showContextMenu('track-row', [{ id: 'play', label: 'Play' }])
    gateway.resolveMenu('play')

    expect(received).toEqual([{ menuId: 'track-row', actionId: 'play' }])
  })

  test('patchTags merges the patch and forgetRoots removes by path', async () => {
    const gateway = new FakeGateway()

    const patched = await gateway.patchTags('tests/fixtures/sine-a440.wav', { title: 'Renamed' })
    expect(patched.title).toBe('Renamed')

    const { removed } = await gateway.forgetRoots([ 'tests/fixtures/sine-a440.wav' ])
    expect(removed).toBe(1)
    await expect(gateway.pageTracks({ limit: 10 })).resolves.toMatchObject({ total: 2 })
  })
})

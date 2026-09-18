/**
 * {@link Gateway} implemented entirely in memory — no `electrobun/view`, no
 * socket. Used by `bun:test` and by Playwright's `?gateway=fake` swap in the
 * composition root (§16). Settings, playlists and analysis rows live in
 * `Map`s; a scan replays its seeded tracks as one `scan.batch` then
 * `scan.done`, scheduled with `queueMicrotask` so callers see the same
 * asynchronous shape the real gateway has without a real clock.
 *
 * `resolveMenu` is a test-only hook: `showContextMenu` resolves immediately
 * (as the real request does — the result arrives separately), and a test
 * calls `resolveMenu(actionId)` to simulate the native menu's `menu.action`
 * message for whichever menu is currently open.
 */
import { DEFAULT_SETTINGS } from '../../../shared/settings'
import type {
  AnalysisJSON,
  MenuItemJSON,
  PlaylistJSON,
  SettingsJSON,
  TagPatchJSON,
  TrackJSON,
} from '../../../shared/dto'
import type {
  Dispose,
  Gateway,
  GatewayMessage,
  GatewayMessagePayload,
  MediaOrigin,
  PageTracksResult,
} from './Gateway'


const FAKE_ORIGIN: MediaOrigin = { origin: 'fake://', token: 'fake' }

/** Three tracks mirroring `tests/fixtures`, the default seed. */
export const DEFAULT_FAKE_TRACKS: readonly TrackJSON[] = [
  {
    id:         'tests/fixtures/sine-a440.wav',
    path:       'tests/fixtures/sine-a440.wav',
    title:      'Sine A440',
    artist:     'Fixture',
    album:      'Fixtures',
    duration:   4,
    format:     'wav',
    size:       352_844,
    coverColor: '#3a3a3f',
    mtimeMs:    0,
  },
  {
    id:         'tests/fixtures/click-120bpm.wav',
    path:       'tests/fixtures/click-120bpm.wav',
    title:      'Click 120bpm',
    artist:     'Fixture',
    album:      'Fixtures',
    duration:   8,
    format:     'wav',
    size:       705_644,
    coverColor: '#4a4a4f',
    mtimeMs:    0,
  },
  {
    id:         'tests/fixtures/tagged.mp3',
    path:       'tests/fixtures/tagged.mp3',
    title:      'Tagged Track',
    artist:     'Fixture Artist',
    album:      'Fixture Album',
    duration:   3,
    format:     'mp3',
    size:       48_128,
    coverColor: '#5a5a5f',
    mtimeMs:    0,
    artId:      'fixture-art',
  },
]

let scanCounter = 0

// See `RpcGateway.ts`'s identical comment: a `Map` keyed by message name
// avoids TypeScript's inability to prove a fresh `Set` matches a
// homomorphic mapped type indexed by the generic `M`.
type AnyHandler = (payload: unknown) => void

type QueryType = { after?: string, limit: number }

export class FakeGateway implements Gateway {
  private readonly handlers = new Map<GatewayMessage, Set<AnyHandler>>()
  private readonly tracks = new Map<string, TrackJSON>()
  private readonly order: string[] = []
  private readonly playlists = new Map<string, PlaylistJSON>()
  private readonly analyses = new Map<string, AnalysisJSON>()
  private readonly cancelled = new Set<string>()
  private settings:       SettingsJSON = DEFAULT_SETTINGS
  private pendingMenu:    string | null = null

  constructor (seed: readonly TrackJSON[] = DEFAULT_FAKE_TRACKS) {
    for (const track of seed) {
      this.tracks.set(track.id, track)
      this.order.push(track.id)
    }
  }

  private dispatch<M extends GatewayMessage> (message: M, payload: GatewayMessagePayload<M>): void {
    const set = this.handlers.get(message)
    if (!set)
      return
    for (const handler of set)
      handler(payload)
  }

  on<M extends GatewayMessage> (message: M, handler: (payload: GatewayMessagePayload<M>) => void): Dispose {
    const set = this.handlers.get(message) ?? new Set<AnyHandler>()
    this.handlers.set(message, set)

    const anyHandler = handler as AnyHandler
    set.add(anyHandler)
    return () =>
      set.delete(anyHandler)
  }

  async getSettings (): Promise<SettingsJSON> {
    return this.settings
  }

  async saveSettings (settings: SettingsJSON): Promise<void> {
    this.settings = settings
  }

  async pickRoot (): Promise<string | null> {
    return null
  }

  async forgetRoots (roots: readonly string[]): Promise<{ removed: number }> {
    const set = new Set(roots)
    let removed = 0

    for (const id of [ ...this.order ]) {
      const track = this.tracks.get(id)
      if (track && set.has(track.path)) {
        this.tracks.delete(id)
        this.order.splice(this.order.indexOf(id), 1)
        removed++
      }
    }

    return { removed }
  }

  async pageTracks (query: QueryType): Promise<PageTracksResult> {
    const startIndex = query.after ? this.order.indexOf(query.after) + 1 : 0
    const slice      = this.order.slice(startIndex, startIndex + query.limit)
    const tracks     = slice.map(id =>
      this.tracks.get(id)).filter((t): t is TrackJSON =>
      t !== undefined)
    const next = startIndex + query.limit < this.order.length ? slice[slice.length - 1] : undefined

    return { tracks, next, total: this.order.length }
  }

  async scan (_roots: readonly string[]): Promise<{ scanId: string }> {
    const scanId = `fake-scan-${++scanCounter}`
    const tracks = [ ...this.tracks.values() ]

    queueMicrotask(() => {
      if (this.cancelled.has(scanId))
        return

      this.dispatch('scan.batch', { scanId, tracks })
      this.dispatch('scan.done', { scanId, total: tracks.length, pruned: []})
    })

    return { scanId }
  }

  async cancelScan (scanId: string): Promise<void> {
    this.cancelled.add(scanId)
  }

  async patchTags (id: string, patch: TagPatchJSON): Promise<TrackJSON> {
    const current = this.tracks.get(id)
    if (!current)
      throw new Error(`FakeGateway.patchTags: unknown track "${id}"`)

    const next = { ...current, ...patch }
    this.tracks.set(id, next)
    return next
  }

  async listPlaylists (): Promise<PlaylistJSON[]> {
    return [ ...this.playlists.values() ]
  }

  async savePlaylist (playlist: PlaylistJSON): Promise<void> {
    this.playlists.set(playlist.id, playlist)
  }

  async deletePlaylist (id: string): Promise<void> {
    this.playlists.delete(id)
  }

  async getAnalysis (id: string, mtimeMs: number, version: number): Promise<AnalysisJSON | null> {
    const stored = this.analyses.get(id)
    if (!stored || stored.version !== version)
      return null
    return mtimeMs === this.tracks.get(id)?.mtimeMs ? stored : null
  }

  async putAnalysis (id: string, _mtimeMs: number, analysis: AnalysisJSON): Promise<void> {
    this.analyses.set(id, analysis)
  }

  async mediaOrigin (): Promise<MediaOrigin> {
    return FAKE_ORIGIN
  }

  async showContextMenu (menuId: string, _items: readonly MenuItemJSON[]): Promise<void> {
    this.pendingMenu = menuId
  }

  async windowCommand (): Promise<void> {}

  async openShell (): Promise<void> {}

  async mediaUrl (id: string): Promise<string> {
    return `fake://media/${encodeURIComponent(id)}`
  }

  async artUrl (artId: string): Promise<string> {
    return `fake://art/${artId}`
  }

  /** Test hook: resolves the most recently opened menu with `actionId` (or `null` for "dismissed"). */
  resolveMenu (actionId: string | null): void {
    const menuId = this.pendingMenu
    if (!menuId)
      return

    this.pendingMenu = null
    this.dispatch('menu.action', { menuId, actionId })
  }
}

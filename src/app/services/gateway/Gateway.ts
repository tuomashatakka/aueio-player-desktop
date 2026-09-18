/**
 * The webview's one door to the main process — every RPC request in
 * `shared/rpc.ts` §5 as an async method, plus `on` for the messages main
 * streams back. `RpcGateway` implements this over the real `electrobun/view`
 * socket; `FakeGateway` implements it in memory for tests and Playwright's
 * `?gateway=fake`. Nothing outside `services/gateway` constructs an
 * `Electroview` or reaches for `window.__electrobun*` directly.
 */
import type {
  AnalysisJSON,
  MenuItemJSON,
  PlaylistJSON,
  SettingsJSON,
  TagPatchJSON,
  TrackJSON,
} from '../../../shared/dto'
import type { AppRPC } from '../../../shared/rpc'


type WebviewMessages = AppRPC['webview']['messages']

/** Every message the main process can stream to the webview. */
export type GatewayMessage = keyof WebviewMessages

/** Payload shape for one streamed message. */
export type GatewayMessagePayload<M extends GatewayMessage> = WebviewMessages[M]

/** Unsubscribes a handler registered with {@link Gateway.on}. */
export type Dispose = () => void

export interface PageTracksResult {
  readonly tracks: TrackJSON[]
  readonly next?:  string
  readonly total:  number
}

export interface MediaOrigin {
  readonly origin: string
  readonly token:  string
}

/**
 * The RPC contract, as the rest of the app sees it. One method per §5
 * request, named after it; `on` replaces subscribing to the raw socket for
 * the messages main pushes (`scan.*`, `menu.action`, `media.command`).
 */
export interface Gateway {
  getSettings ():                                             Promise<SettingsJSON>
  saveSettings (settings: SettingsJSON):                      Promise<void>
  pickRoot ():                                                Promise<string | null>
  forgetRoots (roots: readonly string[]):                     Promise<{ removed: number }>
  pageTracks (query: { after?: string, limit: number }):      Promise<PageTracksResult>
  scan (roots: readonly string[]):                            Promise<{ scanId: string }>
  cancelScan (scanId: string):                                Promise<void>
  patchTags (id: string, patch: TagPatchJSON):                Promise<TrackJSON>
  listPlaylists ():                                           Promise<PlaylistJSON[]>
  savePlaylist (playlist: PlaylistJSON):                      Promise<void>
  deletePlaylist (id: string):                                Promise<void>
  getAnalysis (id: string, mtimeMs: number, version: number): Promise<AnalysisJSON | null>
  putAnalysis (id: string, mtimeMs: number, analysis: AnalysisJSON): Promise<void>
  mediaOrigin ():                                             Promise<MediaOrigin>
  showContextMenu (menuId: string, items: readonly MenuItemJSON[]): Promise<void>
  windowCommand (command: 'minimize' | 'maximize' | 'close' | 'setSize', size?: { width: number, height: number }): Promise<void>
  openShell (kind: 'external' | 'reveal', target: string): Promise<void>

  /** Subscribes to a streamed message; returns the unsubscribe. */
  on<M extends GatewayMessage> (message: M, handler: (payload: GatewayMessagePayload<M>) => void): Dispose

  /** `${origin}/media/${encodeURIComponent(id)}?t=${token}` once the origin is known. */
  mediaUrl (id: string): Promise<string>

  /** `${origin}/art/${artId}?t=${token}` once the origin is known. */
  artUrl (artId: string): Promise<string>
}

/**
 * Shared by every {@link Gateway} implementation's `mediaUrl`/`artUrl`: the id
 * is percent-encoded (it is a filesystem path), the art id is not (it is a
 * hex hash, never user-controlled).
 */
export function buildMediaUrl (origin: MediaOrigin, id: string): string {
  return `${origin.origin}/media/${encodeURIComponent(id)}?t=${origin.token}`
}

export function buildArtUrl (origin: MediaOrigin, artId: string): string {
  return `${origin.origin}/art/${artId}?t=${origin.token}`
}

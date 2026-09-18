/**
 * {@link Gateway} over the real `electrobun/view` socket.
 *
 * `Electroview.defineRPC<AppRPC>` is called once, here, with the request
 * handlers side left empty (the webview answers no requests from main in
 * this contract) and one message handler that fans every streamed message
 * out to whichever `on()` subscribers asked for it — a `Map<message, Set<
 * handler>>`, so more than one subscriber to `scan.batch` (the library effect
 * and, say, a dev overlay) never steps on the other's dispose.
 */
import { Electroview } from 'electrobun/view'
import type { AppRPC } from '../../../shared/rpc'
import type {
  AnalysisJSON,
  MenuItemJSON,
  PlaylistJSON,
  SettingsJSON,
  TagPatchJSON,
  TrackJSON,
} from '../../../shared/dto'
import {
  buildArtUrl,
  buildMediaUrl,
} from './Gateway'
import type {
  Dispose,
  Gateway,
  GatewayMessage,
  GatewayMessagePayload,
  MediaOrigin,
  PageTracksResult,
} from './Gateway'


/** §16: scans are messages, not a request/response pair, so no timeout applies to them. */
const MAX_REQUEST_TIME = 30_000

// A `Map` keyed by message name, rather than an object indexed by the
// generic `M`, sidesteps TypeScript's inability to prove a fresh `Set<
// (payload: GatewayMessagePayload<M>) => void>` matches a homomorphic mapped
// type indexed by that same generic — the handler is cast once, at the one
// point it crosses from "this specific message's payload" to "some
// message's payload".
type AnyHandler = (payload: unknown) => void

type QueryType = { after?: string, limit: number }

type SizeType = { width: number, height: number }

export class RpcGateway implements Gateway {
  private readonly handlers = new Map<GatewayMessage, Set<AnyHandler>>()
  private readonly rpc

  constructor () {
    this.rpc = Electroview.defineRPC<AppRPC>({
      maxRequestTime: MAX_REQUEST_TIME,
      handlers:       {
        messages: {
          'scan.batch': payload =>
            this.dispatch('scan.batch', payload),
          'scan.progress': payload =>
            this.dispatch('scan.progress', payload),
          'scan.done': payload =>
            this.dispatch('scan.done', payload),
          'scan.error': payload =>
            this.dispatch('scan.error', payload),
          'menu.action': payload =>
            this.dispatch('menu.action', payload),
          'media.command': payload =>
            this.dispatch('media.command', payload),
        },
      },
    })
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

  getSettings (): Promise<SettingsJSON> {
    return this.rpc.request['settings.get'](undefined)
  }

  saveSettings (settings: SettingsJSON): Promise<void> {
    return this.rpc.request['settings.save'](settings)
  }

  pickRoot (): Promise<string | null> {
    return this.rpc.request['roots.pick'](undefined)
  }

  forgetRoots (roots: readonly string[]): Promise<{ removed: number }> {
    return this.rpc.request['roots.forget']({ roots: roots as string[] })
  }

  pageTracks (query: QueryType): Promise<PageTracksResult> {
    return this.rpc.request['library.page'](query)
  }

  scan (roots: readonly string[]): Promise<{ scanId: string }> {
    return this.rpc.request['library.scan']({ roots: roots as string[] })
  }

  cancelScan (scanId: string): Promise<void> {
    return this.rpc.request['library.cancel']({ scanId })
  }

  patchTags (id: string, patch: TagPatchJSON): Promise<TrackJSON> {
    return this.rpc.request['track.patchTags']({ id, patch })
  }

  listPlaylists (): Promise<PlaylistJSON[]> {
    return this.rpc.request['playlists.list'](undefined)
  }

  savePlaylist (playlist: PlaylistJSON): Promise<void> {
    return this.rpc.request['playlists.save'](playlist)
  }

  deletePlaylist (id: string): Promise<void> {
    return this.rpc.request['playlists.delete']({ id })
  }

  getAnalysis (id: string, mtimeMs: number, version: number): Promise<AnalysisJSON | null> {
    return this.rpc.request['analysis.get']({ id, mtimeMs, version })
  }

  putAnalysis (id: string, mtimeMs: number, analysis: AnalysisJSON): Promise<void> {
    return this.rpc.request['analysis.put']({ id, mtimeMs, analysis })
  }

  mediaOrigin (): Promise<MediaOrigin> {
    return this.rpc.request['media.origin'](undefined)
  }

  showContextMenu (menuId: string, items: readonly MenuItemJSON[]): Promise<void> {
    return this.rpc.request['menu.context']({ menuId, items: items as MenuItemJSON[] })
  }

  windowCommand (
    command: 'minimize' | 'maximize' | 'close' | 'setSize',
    size?: SizeType
  ): Promise<void> {
    return this.rpc.request['window.command']({ command, width: size?.width, height: size?.height })
  }

  openShell (kind: 'external' | 'reveal', target: string): Promise<void> {
    return this.rpc.request['shell.open']({ kind, target })
  }

  async mediaUrl (id: string): Promise<string> {
    return buildMediaUrl(await this.mediaOrigin(), id)
  }

  async artUrl (artId: string): Promise<string> {
    return buildArtUrl(await this.mediaOrigin(), artId)
  }
}

import type { RPCSchema } from 'electrobun/main'
import type { AnalysisJSON, MenuItemJSON, PlaylistJSON, SettingsJSON, TagPatchJSON, TrackJSON } from './dto'

/**
 * The RPC contract between the Bun main process and the webview. See
 * docs/plans/desktop-audio-migration.md §5 — payloads are JSON over
 * Electrobun's encrypted socket, so no binary and no artwork ever crosses
 * this channel; media and art bytes go over the local HTTP server instead.
 */
export type AppRPC = {
  bun: RPCSchema<{
    requests: {
      'settings.get':     { params: undefined, response: SettingsJSON }
      'settings.save':    { params: SettingsJSON, response: void }
      'roots.pick':       { params: undefined, response: string | null }
      'roots.forget':     { params: { roots: string[] }, response: { removed: number }}
      'library.page':     { params: { after?: string, limit: number }, response: { tracks: TrackJSON[], next?: string, total: number }}
      'library.scan':     { params: { roots: string[] }, response: { scanId: string }}
      'library.cancel':   { params: { scanId: string }, response: void }
      'track.patchTags':  { params: { id: string, patch: TagPatchJSON }, response: TrackJSON }
      'playlists.list':   { params: undefined, response: PlaylistJSON[] }
      'playlists.save':   { params: PlaylistJSON, response: void }
      'playlists.delete': { params: { id: string }, response: void }
      'analysis.get':     { params: { id: string, mtimeMs: number, version: number }, response: AnalysisJSON | null }
      'analysis.put':     { params: { id: string, mtimeMs: number, analysis: AnalysisJSON }, response: void }
      'media.origin':     { params: undefined, response: { origin: string, token: string }}
      'menu.context':     { params: { menuId: string, items: MenuItemJSON[] }, response: void } // result arrives as 'menu.action'
      'window.command':   { params: { command: 'minimize' | 'maximize' | 'close' | 'setSize', width?: number, height?: number }, response: void }
      'shell.open':       { params: { kind: 'external' | 'reveal', target: string }, response: void }
    }
    messages: Record<string, never>
  }>
  webview: RPCSchema<{
    requests: Record<string, never>
    messages: {
      'scan.batch':    { scanId: string, tracks: TrackJSON[] } // ≤ 50 rows, never album_art
      'scan.progress': { scanId: string, seen: number, parsed: number }
      'scan.done':     { scanId: string, total: number, pruned: string[] }
      'scan.error':    { scanId: string, message: string }
      'menu.action':   { menuId: string, actionId: string | null }
      'media.command': { command: 'play-pause' | 'next' | 'previous' }
    }
  }>
}

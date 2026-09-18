/**
 * Main process entry point. Opens the settings and library stores, starts
 * the media server and the scanner, wires the RPC contract (§5) to the
 * app's one `BrowserWindow`, and builds the application menu. See
 * docs/plans/desktop-audio-migration.md §8 and L2.
 */
import { join } from 'node:path'
import { ApplicationMenu, BrowserView, Electrobun, PATHS } from 'electrobun/main'
import type { MenuItemTemplate } from 'electrobun/main'
import type { TrackJSON } from '../shared/dto'
import type { AppRPC } from '../shared/rpc'
import { openLibrary } from './db/repository'
import { createLibraryScanner } from './library/scanner'
import { startMediaServer } from './media/server'
import { contextMenuState, createHandlers } from './rpc/handlers'
import { createMainWindow } from './window'


// Menu-item `action` id → the `media.command` it should send. View items
//  carry an action id too, but the current RPC contract has no channel for
//  view navigation, so they are accelerator-only until a later layer adds
//  one.
const PLAYBACK_ACTIONS: Record<string, MediaCommandType> = {
  'playback.play-pause': 'play-pause',
  'playback.next':       'next',
  'playback.previous':   'previous',
}

const menuTemplate: MenuItemTemplate[] = [
  {
    label:   'Aüeio Player',
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  },
  {
    label:   'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    ],
  },
  {
    label:   'Playback',
    submenu: [
      { label: 'Play/Pause', accelerator: 'Space', action: 'playback.play-pause' },
      { label: 'Next', action: 'playback.next' },
      { label: 'Previous', action: 'playback.previous' },
    ],
  },
  {
    label:   'View',
    submenu: [
      { label: 'Library', accelerator: 'L', action: 'view.library' },
      { label: 'Now Playing', accelerator: 'P', action: 'view.now-playing' },
      { label: 'Settings', accelerator: ',', action: 'view.settings' },
    ],
  },
  {
    label:   'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'close' },
    ],
  },
]

const settingsDir = PATHS.userData
const dbPath      = join(settingsDir, 'library.db')
const db          = openLibrary(dbPath)
const scanner     = createLibraryScanner(dbPath)
const media       = startMediaServer({
  resolvePath: id =>
    db.getById(id)?.path ?? null,
  resolveArt: id =>
    db.artwork.get(id) ?? null,
})
const window = createMainWindow()

const rpc = BrowserView.defineRPC<AppRPC>({
  maxRequestTime: 30_000,
  handlers:       {
    requests: createHandlers({ settingsDir, db, scanner, media, window }),
    messages: {},
  },
})

type MediaCommandType = AppRPC['webview']['messages']['media.command']['command']

scanner.onEvent(event => {
  switch (event.type) {
    case 'batch':
      rpc.send['scan.batch']({ scanId: event.scanId, tracks: event.tracks as TrackJSON[] })
      return
    case 'progress':
      rpc.send['scan.progress']({ scanId: event.scanId, seen: event.seen, parsed: event.parsed })
      return
    case 'done':
      rpc.send['scan.done']({ scanId: event.scanId, total: event.total, pruned: event.pruned })
      return
    case 'error':
      rpc.send['scan.error']({ scanId: event.scanId, message: event.message })
      return
  }
})

ApplicationMenu.setApplicationMenu(menuTemplate)

Electrobun.events.on('application-menu-clicked', actionId => {
  const command = PLAYBACK_ACTIONS[actionId]
  if (command)
    rpc.send['media.command']({ command })
})

Electrobun.events.on('context-menu-clicked', actionId => {
  const menuId = contextMenuState.menuId
  if (menuId)
    rpc.send['menu.action']({ menuId, actionId })
})

Electrobun.events.on('before-quit', () => {
  media.stop()
  db.close()
})

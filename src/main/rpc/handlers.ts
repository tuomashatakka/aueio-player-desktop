/**
 * One request handler per entry in `AppRPC['bun']['requests']` (§5 of
 * docs/plans/desktop-audio-migration.md). Each handler is a thin delegate to
 * the module that actually owns the behaviour — nothing here talks to
 * SQLite, the filesystem or the scanner worker directly. `createHandlers`
 * is the only thing `main/index.ts` needs to build `BrowserView.defineRPC`'s
 * `requests` map.
 */
import { ContextMenu, Utils } from 'electrobun/main'
import type { BrowserWindow, MenuItemTemplate } from 'electrobun/main'
import type { MenuItemJSON } from '../../shared/dto'
import type { AppRPC } from '../../shared/rpc'
import type { Library } from '../db/repository'
import type { LibraryScanner } from '../library/scanner'
import type { MediaServer } from '../media/server'
import { loadSettings, saveSettings } from '../settings/store'
import { applyWindowCommand } from '../window'


/**
 * `menuId` of the context menu most recently opened via `menu.context`.
 * `main/index.ts`'s `context-menu-clicked` listener reads it to know which
 * menu a click belongs to when replying with `menu.action` — Electrobun's
 * native menu is a second window, so the click arrives as its own event,
 * not as this request's response.
 */
type ContextMenuStateType = { menuId: string | null }

export const contextMenuState: ContextMenuStateType = { menuId: null }

type Requests = AppRPC['bun']['requests']

type Handlers = {
  [K in keyof Requests]: (params: Requests[K]['params']) => Requests[K]['response'] | Promise<Requests[K]['response']>
}

export interface HandlerContext {
  settingsDir: string
  db:          Library
  scanner:     LibraryScanner
  media:       MediaServer
  getWindow:   () => BrowserWindow
}

function toMenuItem (item: MenuItemJSON): MenuItemTemplate {
  if ('separator' in item)
    return { type: 'separator' }
  return { label: item.label, action: item.id, enabled: item.enabled, checked: item.checked }
}

export function createHandlers (ctx: HandlerContext): Handlers {
  return {
    'settings.get': () =>
      loadSettings(ctx.settingsDir),
    'settings.save': json =>
      saveSettings(ctx.settingsDir, json),
    'roots.pick': async () => {
      const picked = await Utils.openFileDialog({
        canChooseDirectory:      true,
        canChooseFiles:          false,
        allowsMultipleSelection: false,
      })
      return picked?.[0] ?? null
    },
    'roots.forget': ({ roots }) =>
      ctx.db.forgetRoots(roots),
    'library.page': ({ after, limit }) =>
      ctx.db.pageTracks({ after, limit }),
    'library.scan': ({ roots }) =>
      ({ scanId: ctx.scanner.scan(roots) }),
    'library.cancel': ({ scanId }) =>
      ctx.scanner.cancel(scanId),
    'track.patchTags': ({ id, patch }) =>
      ctx.db.patchTags(id, patch),
    'playlists.list': () =>
      ctx.db.playlists.list(),
    'playlists.save': playlist =>
      ctx.db.playlists.save(playlist),
    'playlists.delete': ({ id }) =>
      ctx.db.playlists.delete(id),
    'analysis.get': ({ id, mtimeMs, version }) =>
      ctx.db.analysis.get(id, mtimeMs, version) ?? null,
    'analysis.put': ({ id, mtimeMs, analysis }) =>
      ctx.db.analysis.put(id, mtimeMs, analysis.version, analysis),
    'media.origin': () =>
      ({ origin: ctx.media.origin, token: ctx.media.token }),
    'menu.context': ({ menuId, items }) => {
      contextMenuState.menuId = menuId
      ContextMenu.showContextMenu(items.map(toMenuItem))
    },
    'window.command': ({ command, width, height }) =>
      applyWindowCommand(ctx.getWindow(), { command, width, height }),
    'shell.open': ({ kind, target }) => {
      if (kind === 'external')
        Utils.openExternal(target)
      else
        Utils.showItemInFolder(target)
    },
  }
}

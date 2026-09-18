/**
 * The app's one `BrowserWindow`, and the `window.command` RPC request's
 * implementation. See docs/plans/desktop-audio-migration.md §5 and L2.
 */
import { BrowserWindow } from 'electrobun/main'
import type { AppRPC } from '../shared/rpc'


type WindowCommandParams = AppRPC['bun']['requests']['window.command']['params']

export function createMainWindow (rpc: unknown): BrowserWindow {
  return new BrowserWindow({
    rpc,
    title:         'Aüeio Player',
    url:           'views://app/index.html',
    titleBarStyle: 'hiddenInset',
    frame:         { x: 100, y: 80, width: 1100, height: 720 },
  })
}

/** Applies one `window.command` request to `win`. `setSize` is a no-op without both dimensions. */
export function applyWindowCommand (win: BrowserWindow, command: WindowCommandParams): void {
  switch (command.command) {
    case 'minimize':
      win.minimize()
      return
    case 'maximize':
      win.maximize()
      return
    case 'close':
      win.close()
      return
    case 'setSize':
      if (command.width !== undefined && command.height !== undefined)
        win.setSize(command.width, command.height)
      return
  }
}

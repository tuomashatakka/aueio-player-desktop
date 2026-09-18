/**
 * Standalone shim for Electrobun 2's types.
 *
 * `.hutch/devkit/tsconfig.json` (and the real types that ship with it) could
 * not be obtained in this container — hutch's artifact fetch uses a
 * WebSocket tunnel, which the sandboxed egress proxy does not support. This
 * file declares just enough of `electrobun`, `electrobun/main` and
 * `electrobun/view` for `tsc` to pass. Delete it once `hutch electrobun
 * sync` can run and replace `tsconfig.json`'s `include`/`compilerOptions`
 * with `extends: "./.hutch/devkit/tsconfig.json"`.
 */

declare module 'electrobun' {
  export interface ElectrobunConfig {
    app: {
      name:       string
      identifier: string
      version:    string
    }
    build: {
      mainProcess: 'bun' | 'cottontail'
      bun?: {
        entrypoint: string
      }
      views?: Record<string, { entrypoint: string }>
      copy?:  Record<string, string>
      mac?:   { bundleCEF?: boolean }
      linux?: { bundleCEF?: boolean }
      win?:   { bundleCEF?: boolean }
    }
    release?: {
      baseUrl?: string
    }
  }
}

declare module 'electrobun/main' {
  export type RPCSchema<T> = T

  export interface BrowserWindowOptions {
    title?:         string
    url?:           string
    html?:          string
    titleBarStyle?: 'default' | 'hidden' | 'hiddenInset'
    frame?: {
      x?:      number
      y?:      number
      width?:  number
      height?: number
    }
  }

  export class BrowserWindow {
    id: number
    constructor (options: BrowserWindowOptions)
    close (): void
    minimize (): void
    maximize (): void
    setSize (width: number, height: number): void
  }

  // Every handler in `defineRPC`'s `requests` map takes that request's own
  // `params` and returns its own `response` (sync or async); `send` mirrors
  // the `webview` side's `messages`, one sender per message name — this is
  // what lets `rpc.send['scan.batch'](payload)` type-check against
  // `AppRPC['webview']['messages']['scan.batch']`.
  type RPCRequestHandlers<Requests> = {
    [K in keyof Requests]: Requests[K] extends { params: infer P, response: infer R }
      ? (params: P) => R | Promise<R>
      : never
  }

  type RPCMessageHandlers<Messages> = {
    [K in keyof Messages]: (payload: Messages[K]) => void
  }

  type BrowserViewType = {
    defineRPC<Schema extends {
      bun:     { requests: Record<string, unknown>, messages: Record<string, unknown> }
      webview: { requests: Record<string, unknown>, messages: Record<string, unknown> }
    }> (config: {
      maxRequestTime?: number
      handlers: {
        requests?: RPCRequestHandlers<Schema['bun']['requests']>
        messages?: RPCMessageHandlers<Schema['bun']['messages']>
      }
    }): { send: RPCMessageHandlers<Schema['webview']['messages']> }
  }

  export const BrowserView: BrowserViewType

  export interface MenuItemTemplate {
    label?:       string
    role?:        string
    accelerator?: string
    action?:      string
    type?:        'separator'
    enabled?:     boolean
    checked?:     boolean
    submenu?:     MenuItemTemplate[]
  }

  type ApplicationMenuType = {
    setApplicationMenu (template: MenuItemTemplate[]): void
  }

  export const ApplicationMenu: ApplicationMenuType

  type ContextMenuType = {
    showContextMenu (items: unknown[]): void
  }

  export const ContextMenu: ContextMenuType

  export interface OpenFileDialogOptions {
    startingFolder?:          string
    allowedFileTypes?:        string
    canChooseFiles?:          boolean
    canChooseDirectory?:      boolean
    allowsMultipleSelection?: boolean
  }

  type UtilsType = {
    openFileDialog:   (options: OpenFileDialogOptions) => Promise<string[] | null>
    openExternal:     (url: string) => void
    showItemInFolder: (path: string) => void
  }

  export const Utils: UtilsType

  type PATHSType = {
    userData: string
    appPath:  string
  }

  export const PATHS: PATHSType

  // Known event names get a typed payload; anything else falls back to the
  // permissive signature so a not-yet-modelled event still compiles.
  type ElectrobunEventMap = {
    'application-menu-clicked': (actionId: string) => void
    'context-menu-clicked':     (actionId: string | null) => void
    'before-quit':              () => void
  }

  type ElectrobunType = {
    events: {
      on<K extends keyof ElectrobunEventMap> (event: K, handler: ElectrobunEventMap[K]): void
      on (event: string, handler: (...args: unknown[]) => void): void
      off<K extends keyof ElectrobunEventMap> (event: K, handler: ElectrobunEventMap[K]): void
      off (event: string, handler: (...args: unknown[]) => void): void
    }
  }

  export const Electrobun: ElectrobunType
}

declare module 'electrobun/view' {
  export type RPCSchema<T> = T

  type RpcType = {
    request: Record<string, (params: unknown) => Promise<unknown>>
    send:    Record<string, (payload: unknown) => void>
  }

  export class Electroview<Schema = unknown> {
    rpc: RpcType
    constructor (config?: { maxRequestTime?: number })
    defineRPC (config: {
      maxRequestTime?: number
      handlers?: {
        messages?: Record<string, (payload: unknown) => void>
      }
    }): void
  }
}

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
    url?:           string | null
    html?:          string | null
    titleBarStyle?: 'default' | 'hidden' | 'hiddenInset'
    renderer?:      'native' | 'cef'
    transparent?:   boolean
    rpc?:           unknown
    frame?: {
      x?:     number
      y?:     number
      width:  number
      height: number
    }
  }

  export class BrowserWindow {
    id: number
    constructor (options?: BrowserWindowOptions)
    close (): void
    focus (): void
    minimize (): void
    maximize (): void
    unmaximize (): void
    isMaximized (): boolean
    setTitle (title: string): void
    setSize (width: number, height: number): void
    setFrame (x: number, y: number, width: number, height: number): void
    on (name: string, handler: (event: unknown) => void): void
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

  export type MenuItemTemplate =
    | { type: 'separator' | 'divider' } |
    {
      type?:        'normal'
      label?:       string
      role?:        string
      accelerator?: string
      action?:      string
      data?:        unknown
      enabled?:     boolean
      checked?:     boolean
      hidden?:      boolean
      tooltip?:     string
      submenu?:     MenuItemTemplate[]
    }

  export type MenuClickedData = {
    id?:    number
    action: string
    data?:  unknown
  }

  export class ElectrobunEvent<Data = unknown, Response = unknown> {
    name:           string
    data:           Data
    response:       Response | undefined
    responseWasSet: boolean
    clearResponse (): void
  }

  type ApplicationMenuType = {
    setApplicationMenu (template: MenuItemTemplate[]): void
    on (name: 'application-menu-clicked', handler: (event: ElectrobunEvent<MenuClickedData, void>) => void): void
  }

  export const ApplicationMenu: ApplicationMenuType

  type ContextMenuType = {
    showContextMenu (items: MenuItemTemplate[]): void
    on (name: 'context-menu-clicked', handler: (event: ElectrobunEvent<MenuClickedData, void>) => void): void
  }

  export const ContextMenu: ContextMenuType

  export interface OpenFileDialogOptions {
    startingFolder?:          string
    allowedFileTypes?:        string
    canChooseFiles?:          boolean
    canChooseDirectory?:      boolean
    allowsMultipleSelection?: boolean
  }

  type UserPaths = {
    home:      string
    appData:   string
    config:    string
    cache:     string
    temp:      string
    logs:      string
    documents: string
    downloads: string
    desktop:   string
    pictures:  string
    music:     string
    videos:    string
    userData:  string
    userCache: string
    userLogs:  string
  }

  type UtilsType = {
    openFileDialog:   (options: OpenFileDialogOptions) => Promise<string[]>
    openExternal:     (url: string) => boolean
    openPath:         (path: string) => boolean
    showItemInFolder: (path: string) => void
    moveToTrash:      (path: string) => void
    quit:             (code?: number) => boolean
    paths:            UserPaths
  }

  export const Utils: UtilsType

  type PATHSType = {
    RESOURCES_FOLDER: string
    VIEWS_FOLDER:     string
  }

  export const PATHS: PATHSType

  // Known event names get a typed payload; anything else falls back to the
  // permissive signature so a not-yet-modelled event still compiles.
  type ElectrobunEventMap = {
    'application-menu-clicked': (event: ElectrobunEvent<MenuClickedData, void>) => void
    'context-menu-clicked':     (event: ElectrobunEvent<MenuClickedData, void>) => void
    'before-quit':              (event: ElectrobunEvent<Record<string, never>, { allow: boolean }>) => void
  }

  type EventEmitterType = {
    on<K extends keyof ElectrobunEventMap> (event: K, handler: ElectrobunEventMap[K]): void
    on (event: string, handler: (event: unknown) => void): void
    off (event: string, handler: (event: unknown) => void): void
  }

  type ElectrobunDefault = {
    events:          EventEmitterType
    BrowserWindow:   typeof BrowserWindow
    BrowserView:     BrowserViewType
    ApplicationMenu: ApplicationMenuType
    ContextMenu:     ContextMenuType
    Utils:           UtilsType
    PATHS:           PATHSType
  }

  const Electrobun: ElectrobunDefault

  export default Electrobun
}

declare module 'electrobun/view' {
  export type RPCSchema<T> = T

  type SchemaShape = {
    bun:     { requests: Record<string, unknown>, messages: Record<string, unknown> }
    webview: { requests: Record<string, unknown>, messages: Record<string, unknown> }
  }

  // The webview's own `requests` map has no callers here (nothing in AppRPC
  // asks main to call back into the view as a request), but `handlers.requests`
  // is where the view would answer one if the schema ever grew one.
  type RPCRequestHandlers<Requests> = {
    [K in keyof Requests]: Requests[K] extends { params: infer P, response: infer R }
      ? (params: P) => R | Promise<R>
      : never
  }

  type RPCMessageHandlers<Messages> = {
    [K in keyof Messages]: (payload: Messages[K]) => void
  }

  // What `Electroview.defineRPC` hands back: one async caller per `bun`
  // request, resolving to that request's own response type.
  type RPCRequestCallers<Requests> = {
    [K in keyof Requests]: Requests[K] extends { params: infer P, response: infer R }
      ? (params: P, opts?: { timeout?: number }) => Promise<R>
      : never
  }

  // One fire-and-forget sender per message the view may push to main
  // (`bun.messages` — empty in `AppRPC` today, but the shape stays generic).
  type RPCSenders<Messages> = {
    [K in keyof Messages]: (payload: Messages[K]) => void
  }

  export interface RPCDefineConfig<Schema extends SchemaShape> {
    maxRequestTime?: number
    handlers: {
      requests?: RPCRequestHandlers<Schema['webview']['requests']>
      messages?: RPCMessageHandlers<Schema['webview']['messages']>
    }
  }

  export interface RPCHandle<Schema extends SchemaShape> {
    request: RPCRequestCallers<Schema['bun']['requests']>
    send:    RPCSenders<Schema['bun']['messages']>
  }

  export class Electroview<Rpc = RPCHandle<SchemaShape>> {
    rpc: Rpc
    constructor (config?: { rpc?: Rpc })

    static defineRPC<Schema extends SchemaShape> (config: RPCDefineConfig<Schema>): RPCHandle<Schema>
  }
}

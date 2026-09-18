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
    setSize (width: number, height: number): void
  }

  type BrowserViewType = {
    defineRPC<Schema> (config: {
      maxRequestTime?: number
      handlers: {
        requests?: Record<string, (params: unknown) => unknown>
        messages?: Record<string, (payload: unknown) => void>
      }
    }): unknown
  }

  export const BrowserView: BrowserViewType

  type ApplicationMenuType = {
    setApplicationMenu (template: unknown[]): void
  }

  export const ApplicationMenu: ApplicationMenuType

  type ContextMenuType = {
    show (items: unknown[]): Promise<unknown>
  }

  export const ContextMenu: ContextMenuType

  export const Utils: Record<string, (...args: unknown[]) => unknown>

  type PATHSType = {
    userData: string
    appPath:  string
  }

  export const PATHS: PATHSType

  type ElectrobunType = {
    events: {
      on (event: string, handler: (...args: unknown[]) => void): void
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

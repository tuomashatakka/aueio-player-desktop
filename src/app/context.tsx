import { createContext, useContext } from 'react'
import type { Store } from './state/index'
import type { RPCClient } from './rpc/index'
import type { AudioEngine } from './audio/AudioEngine'


export const StoreContext   = createContext<Store | null>(null)

export const RPCContext     = createContext<RPCClient | null>(null)

export const EngineContext  = createContext<AudioEngine | null>(null)

export const useStore = (): Store => {
  const ctx = useContext(StoreContext)
  if (!ctx)
    throw new Error('StoreContext not provided')
  return ctx
}

export const useRPC = (): RPCClient => {
  const ctx = useContext(RPCContext)
  if (!ctx)
    throw new Error('RPCContext not provided')
  return ctx
}

export const useEngine = (): AudioEngine => {
  const ctx = useContext(EngineContext)
  if (!ctx)
    throw new Error('EngineContext not provided')
  return ctx
}

/**
 * The composition root's one import from `ui/`: `<App stores={stores} />`.
 * Wraps `Shell` in `StoresContext` — see AGENTS.md L8.
 */
import type { ReactElement } from 'react'
import type { Stores } from '../state'
import { StoresContext } from './hooks/useStore'
import { Shell } from './layout/Shell'


export interface AppProps {
  readonly stores: Stores
}

export function App ({ stores }: AppProps): ReactElement {
  return <StoresContext.Provider value={ stores }>
    <Shell />
  </StoresContext.Provider>
}

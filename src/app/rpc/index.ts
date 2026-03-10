import { Electroview } from 'electrobun/view'
import type { AppRPCSchema } from '../../bun/rpc'
import type { Store } from '../state/index'
import { ActionType } from '../state/actions'


export type RPCClient = ReturnType<typeof Electroview.defineRPC<AppRPCSchema>>

export const initRPC = (store: Store): RPCClient => {
  const rpc = Electroview.defineRPC<AppRPCSchema>({
    handlers: {
      requests: {},
      messages: {
        libraryUpdated: tracks => {
          store.dispatch({ type: ActionType.TRACKS_LOADED, payload: tracks })
        },
        settingsSaved: settings => {
          store.dispatch({ type: ActionType.SETTINGS_UPDATED, payload: settings })
        },
      },
    },
  })

  new Electroview({ rpc })
  return rpc
}

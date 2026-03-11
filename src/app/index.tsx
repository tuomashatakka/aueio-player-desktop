import { createRoot } from 'react-dom/client'
import { createStore, initialState } from './state/index'
import { initRPC } from './rpc/index'
import { AudioEngine } from './audio/AudioEngine'
import { App } from './components/App'


const store  = createStore(initialState)
const rpc    = initRPC(store)
const engine = AudioEngine.getInstance()

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('[aueio] No #root element found')

createRoot(rootEl).render(<App store={store} rpc={rpc} engine={engine} />)

import type { ViewName } from '../state/types'


type Props = {
  activeView: ViewName
  onNav: (view: ViewName) => void
}

export const Topbar = ({ activeView, onNav }: Props) => (
  <header id="topbar">
    <span id="app-title">Aüeio</span>
    <button
      id="nav-library"
      data-nav="library"
      className={activeView === 'library' ? 'active' : ''}
      onClick={() => onNav('library')}
    >
      Library
    </button>
    <button
      id="nav-settings"
      data-nav="settings"
      className={activeView === 'settings' ? 'active' : ''}
      onClick={() => onNav('settings')}
    >
      Settings
    </button>
  </header>
)

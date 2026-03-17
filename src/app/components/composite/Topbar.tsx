import { memo } from 'react'
import { useSelector } from '../../hooks/useSelector'
import { useNavigation } from '../../hooks/useNavigation'
import { selectActiveView } from '../../selectors/index'


export const Topbar = memo(() => {
  const activeView = useSelector(selectActiveView)
  const { handleNav } = useNavigation()

  return (
    <header id='topbar'>
      <span id='app-title'>Aüeio</span>

      <button
        id='nav-library'
        data-nav='library'
        className={activeView === 'library' ? 'active' : ''}
        onClick={() =>
          handleNav('library')}
      >
        Library
      </button>

      <button
        id='nav-settings'
        data-nav='settings'
        className={activeView === 'settings' ? 'active' : ''}
        onClick={() =>
          handleNav('settings')}
      >
        Settings
      </button>
    </header>
  )
})

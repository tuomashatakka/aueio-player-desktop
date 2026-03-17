import { useEffect } from 'react'
import { useSelector } from './useSelector'
import { selectTheme } from '../selectors/index'


/**
 * Syncs the current theme to document.documentElement.dataset.theme.
 */
export const useThemeSync = (): void => {
  const theme = useSelector(selectTheme)

  useEffect(() => {
    // eslint-disable-next-line functional/immutable-data
    document.documentElement.dataset.theme = theme
  }, [ theme ])
}

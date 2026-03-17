import { useCallback } from 'react'
import { useDispatch } from './useSelector'
import type { ViewName } from '../state/types'
import { ActionType } from '../state/actions'
import { navigate } from '../navigation/index'


export const useNavigation = () => {
  const dispatch = useDispatch()

  const handleNav = useCallback((view: ViewName) => {
    dispatch({ type: ActionType.VIEW_CHANGED, payload: view })
    navigate(view)
  }, [ dispatch ])

  return { handleNav }
}

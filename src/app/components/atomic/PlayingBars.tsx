import { memo } from 'react'


type Props = { readonly paused?: boolean }

export const PlayingBars = memo(({ paused }: Props) =>

  <span className={`playing-bars${paused ? ' paused' : ''}`}>
    <span className='playing-bar' />
    <span className='playing-bar' />
    <span className='playing-bar' />
  </span>
)

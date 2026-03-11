type Props = { readonly paused?: boolean }

export const PlayingBars = ({ paused }: Props) =>

  <span className={`playing-bars${paused ? ' paused' : ''}`}>
    <span className='playing-bar' />
    <span className='playing-bar' />
    <span className='playing-bar' />
  </span>

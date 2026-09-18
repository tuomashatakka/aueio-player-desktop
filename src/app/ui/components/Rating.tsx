/** The five-star `.rating` control — reused by the track table and grid card. */
import type { ReactElement } from 'react'
import { useStores } from '../hooks/useStore'


const STAR_COUNT = 5

interface RatingProps {
  readonly trackId: string
  readonly rating:  number | undefined
}

export function Rating ({ trackId, rating }: RatingProps): ReactElement {
  const stores = useStores()
  const value  = rating ?? 0

  function rate (star: number): void {
    stores.library.dispatch({ type: 'library/tagsPatchRequested', id: trackId, patch: { rating: star }})
  }

  return <div className="rating">
    {Array.from({ length: STAR_COUNT }, (_, index) =>
      <RatingStar key={ index } star={ index + 1 } lit={ index + 1 <= value } onRate={ rate } />)}
  </div>
}

interface RatingStarProps {
  readonly star:   number
  readonly lit:    boolean
  readonly onRate: (star: number) => void
}

function RatingStar ({ star, lit, onRate }: RatingStarProps): ReactElement {
  function onClick (): void {
    onRate(star)
  }

  return <button aria-pressed={ lit } onClick={ onClick }>★</button>
}

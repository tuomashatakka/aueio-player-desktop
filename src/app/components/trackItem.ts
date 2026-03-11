import type { Track } from '../state/types'
import type { Store } from '../state/index'
import { ActionType } from '../state/actions'
import { escapeHtml, formatTime } from '../utils/dom'
import { getTrackEmoji } from '../utils/audio'


export const buildTrackItem = (
  track: Track,
  idx: number,
  isCurrent: boolean,
  isPlaying: boolean,
  dispatch: Store['dispatch']
): HTMLElement => {
  const item = document.createElement('div')
  item.className = `track-item${isCurrent ? ' playing' : ''}`
  item.setAttribute('role', 'listitem')
  item.setAttribute('tabindex', '0')
  item.dataset.trackIdx = String(idx)

  const color = track.coverColor ?? 'hsl(220, 60%, 40%)'
  const emoji = getTrackEmoji(track)
  const playingBars = isPlaying
    ? `<div class='playing-bars'>
         <div class='playing-bar'></div>
         <div class='playing-bar'></div>
         <div class='playing-bar'></div>
       </div>`
    : ''

  item.innerHTML = `
    <div class='track-cover'>
      <div class='track-cover-bg' style='background: ${color}'></div>
      <span class='track-cover-icon'>${emoji}</span>
    </div>
    <div class='track-info'>
      <div class='track-title'>${escapeHtml(track.title)}</div>
      <div class='track-artist'>${escapeHtml(track.artist)}</div>
    </div>
    <div class='track-duration'>${track.duration > 0 ? formatTime(track.duration) : ''}</div>
    <div class='track-playing-indicator' aria-hidden='true'>${playingBars}</div>
  `

  const play = () =>
    dispatch({ type: ActionType.TRACK_SELECTED, payload: idx })
  item.addEventListener('click', play)
  item.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      play()
    }
  })

  return item
}

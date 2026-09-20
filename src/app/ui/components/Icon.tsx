/**
 * The app's icon set: one stroked 24×24 SVG per name, drawn in
 * `currentColor` so every icon inherits whatever colour (and colour
 * *transition*) its button already declares — the chrome's hover, pressed
 * and accent states are all CSS, never a second icon.
 *
 * Sizing is CSS's job too: `components.css` sets `svg { inline-size; … }`
 * per context (a transport button's icon is larger than a titlebar one), so
 * nothing here carries a width or height.
 */
import type { ReactElement, ReactNode } from 'react'


/**
 * `play` and `pause` are solid shapes (a filled triangle and two filled
 * bars) because they sit on the accent-filled transport button, where a
 * stroked glyph reads as hollow; everything else is a 2px stroke.
 */
const PATHS: Record<string, ReactNode> = {
  menu:     <path d="M4 7h16M4 12h16M4 17h16" />,
  minimize: <path d="M5 12h14" />,
  maximize: <rect x="5" y="5" width="14" height="14" rx="2" />,
  close:    <path d="M6 6l12 12M18 6L6 18" />,
  search:   <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4.2-4.2" />,
  expand:   <path d="M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5" />,
  analysis: <path d="M2 18l4.5-7L10 15l4-9 3.5 6L22 18" />,
  lyrics:   <path d="M4 6h16M4 11h11M4 16h14M4 21h8" />,
  sliders:  <path d="M4 7h10M18 7h2M4 17h2M10 17h10M16 5v4M8 15v4" />,
  shuffle:  <path d="M3 5h4l10 14h4M17 3l4 2-4 2M3 19h4l3-4M14 9l3-4h4M17 17l4 2-4 2" />,
  previous: <path d="M18 5v14L8 12zM6 5v14" />,
  next:     <path d="M6 5v14l10-7zM18 5v14" />,
  repeat:   <path d="M4 10V9a4 4 0 0 1 4-4h12M20 14v1a4 4 0 0 1-4 4H4M17 2l3 3-3 3M7 16l-3 3 3 3" />,
  play:     <path d="M8 5.5v13a1 1 0 0 0 1.54.84l10-6.5a1 1 0 0 0 0-1.68l-10-6.5A1 1 0 0 0 8 5.5z" fill="currentColor" stroke="none" />,
  pause:    <path d="M9 5h2.5v14H9zM12.5 5H15v14h-2.5z" fill="currentColor" stroke="none" />,
}

export type IconName = keyof typeof PATHS

interface IconProps {
  readonly name: IconName
}

export function Icon ({ name }: IconProps): ReactElement {
  return <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={ 2 }
    strokeLinecap="round"
    strokeLinejoin="round">
    {PATHS[name]}
  </svg>
}

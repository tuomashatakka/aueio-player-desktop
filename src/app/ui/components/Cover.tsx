/**
 * The album art `<figure>` — never a button (see AGENTS.md L8, "Two Views,
 * One Layer": the window-size toggle lives in its own control, not here).
 *
 * No `mediaOrigin` slice exists in `state/` yet — `media.origin` is an RPC
 * result an effect would fold in — so the art URL is never known here yet.
 * `src` is therefore omitted entirely (never an empty string, which WebKit
 * and Chromium both resolve as a request for the current document) and
 * `data-art-id` carries the id an effect can resolve into a URL later. Until
 * then `.cover`'s `background: var(--cover-color, var(--surface-raised))`
 * (`components.css`) paints the figure itself.
 */
import type { ReactElement } from 'react'
import { useCurrentTrack } from '../hooks/useCurrentTrack'


export function Cover (): ReactElement {
  const track = useCurrentTrack()

  return <figure className="cover">
    <img data-art-id={ track?.artId ?? '' } alt="" loading="lazy" decoding="async" />
  </figure>
}

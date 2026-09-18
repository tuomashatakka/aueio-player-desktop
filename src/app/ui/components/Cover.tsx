/**
 * The album art `<figure>` — never a button (see AGENTS.md L8, "Two Views,
 * One Layer": the window-size toggle lives in its own control, not here).
 *
 * No `mediaOrigin` slice exists in `state/` yet — `media.origin` is an RPC
 * result an effect would fold in — so `src` stays empty for now and
 * `data-art-id` carries the id an effect can resolve into a URL later.
 */
import type { ReactElement } from 'react'
import { useCurrentTrack } from '../hooks/useCurrentTrack'


export function Cover (): ReactElement {
  const track = useCurrentTrack()

  return <figure className="cover">
    <img data-art-id={ track?.artId ?? '' } src="" alt="" loading="lazy" decoding="async" />
  </figure>
}

/** The lyrics layer: one `<p>` per line of `Track.lyrics`. */
import type { ReactElement } from 'react'
import { useCurrentTrack } from '../hooks/useCurrentTrack'


const LINE_BREAK = /\r?\n/

export function Lyrics (): ReactElement {
  const track = useCurrentTrack()
  const lines = track?.lyrics ? track.lyrics.split(LINE_BREAK) : []

  return <section className="lyrics">
    {lines.map((line, index) =>
      <p key={ index }>{line}</p>)}
  </section>
}

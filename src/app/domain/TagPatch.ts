/** The tag editor's output, applied as a patch onto an existing {@link Track}. */
import type { TagPatchJSON } from '../../shared/dto'
import { Track } from './Track'


export function applyTagPatch (track: Track, patch: TagPatchJSON): Track {
  return track.with(patch)
}

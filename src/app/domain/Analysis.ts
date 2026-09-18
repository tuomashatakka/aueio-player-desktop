/**
 * A track's resolved harmony: key, tempo and the chord timeline.
 *
 * Ported from desktop-audio/src/app/components/composite/AnalysisReadout.tsx
 * (`chordAt`, `firstAfter`, `queuedChords`), moved onto the DTO itself.
 */
import type { AnalysisJSON, ChordSegmentJSON } from '../../shared/dto'

/**
 * How many chords past the current one {@link Analysis.queuedChords} returns
 * by default. A ceiling on results, not on what is visible.
 */
const DEFAULT_QUEUE_LENGTH = 16

function normalizeChords (value: unknown): readonly ChordSegmentJSON[] {
  if (!Array.isArray(value))
    return []

  return value
    .filter((c): c is ChordSegmentJSON =>
      typeof c === 'object' && c !== null &&
      typeof (c as ChordSegmentJSON).start === 'number' &&
      typeof (c as ChordSegmentJSON).end === 'number')
    .map(c =>
      ({
        start:      c.start,
        end:        c.end,
        label:      typeof c.label === 'string' ? c.label : '',
        confidence: typeof c.confidence === 'number' ? c.confidence : 0,
      }))
}

export class Analysis {
  private constructor (
    readonly version:  number,
    readonly duration: number,
    readonly tempo:    AnalysisJSON['tempo'],
    readonly key:      AnalysisJSON['key'],
    readonly chords:   readonly ChordSegmentJSON[],
  ) {
    Object.freeze(this)
  }

  static fromJSON (json: AnalysisJSON): Analysis {
    const tempo = json.tempo ?? { bpm: 0, confidence: 0 }
    const key   = json.key ?? { tonic: '', scale: 'unknown', label: '', confidence: 0 }

    return new Analysis(
      Number.isFinite(json.version) ? json.version : 1,
      Number.isFinite(json.duration) ? json.duration : 0,
      { bpm: Number(tempo.bpm) || 0, confidence: Number(tempo.confidence) || 0 },
      {
        tonic:      typeof key.tonic === 'string' ? key.tonic : '',
        scale:      key.scale === 'major' || key.scale === 'minor' ? key.scale : 'unknown',
        label:      typeof key.label === 'string' ? key.label : '',
        confidence: Number(key.confidence) || 0,
      },
      normalizeChords(json.chords),
    )
  }

  toJSON (): AnalysisJSON {
    return {
      version:  this.version,
      duration: this.duration,
      tempo:    this.tempo,
      key:      this.key,
      chords:   this.chords as ChordSegmentJSON[],
    }
  }

  with (patch: Partial<AnalysisJSON>): Analysis {
    return Analysis.fromJSON({ ...this.toJSON(), ...patch })
  }

  /** The index of the chord sounding at `time`, or `-1` between or before them. */
  chordAt (time: number): number {
    return this.chords.findIndex(chord =>
      time >= chord.start && time < chord.end)
  }

  /** The index of the first chord that has not started yet, or `-1`. */
  firstAfter (time: number): number {
    return this.chords.findIndex(chord =>
      chord.start > time)
  }

  /** The chords a queue readout should hold, given the sounding one at `time`. */
  queuedChords (time: number, n: number = DEFAULT_QUEUE_LENGTH): readonly ChordSegmentJSON[] {
    const current = this.chordAt(time)
    const from    = current >= 0 ? current + 1 : this.firstAfter(time)
    return from < 0 ? [] : this.chords.slice(from, from + n)
  }
}

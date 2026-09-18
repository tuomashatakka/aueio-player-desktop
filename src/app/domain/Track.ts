/**
 * A single audio file in the library.
 *
 * Immutable value: `fromJSON` validates and defaults, `toJSON` round-trips
 * back to the wire shape, `with` produces a patched copy. See AGENTS.md L3.
 */
import type { TrackJSON } from '../../shared/dto'


const SEPARATOR = /[/\\]/

/** The filename component of `path`, extension stripped. */
function filenameOf (path: string): string {
  const base = path.split(SEPARATOR).filter(Boolean)
    .at(-1) ?? path
  const dot  = base.lastIndexOf('.')
  return dot > 0 ? base.slice(0, dot) : base
}

function num (value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function str (value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export class Track {
  private constructor (
    readonly id: string,
    readonly path: string,
    readonly title: string,
    readonly artist: string,
    readonly album: string,
    readonly albumArtist: string | undefined,
    readonly duration: number,
    readonly format: string,
    readonly size: number,
    readonly year: number | undefined,
    readonly genre: string | undefined,
    readonly trackNumber: number | undefined,
    readonly discNumber: number | undefined,
    readonly rating: number | undefined,
    readonly bpm: number | undefined,
    readonly comment: string | undefined,
    readonly lyrics: string | undefined,
    readonly bitrate: number | undefined,
    readonly sampleRate: number | undefined,
    readonly channels: number | undefined,
    readonly artId: string | undefined,
    readonly coverColor: string,
    readonly mtimeMs: number,
  ) {
    Object.freeze(this)
  }

  static fromJSON (json: TrackJSON): Track {
    const path = typeof json.path === 'string' ? json.path : ''
    const id   = typeof json.id === 'string' && json.id.length > 0 ? json.id : path

    return new Track(
      id,
      path,
      typeof json.title === 'string' ? json.title : '',
      typeof json.artist === 'string' ? json.artist : '',
      typeof json.album === 'string' ? json.album : '',
      str(json.albumArtist),
      num(json.duration) ?? 0,
      typeof json.format === 'string' ? json.format : '',
      num(json.size) ?? 0,
      num(json.year),
      str(json.genre),
      num(json.trackNumber),
      num(json.discNumber),
      num(json.rating),
      num(json.bpm),
      str(json.comment),
      str(json.lyrics),
      num(json.bitrate),
      num(json.sampleRate),
      num(json.channels),
      str(json.artId),
      typeof json.coverColor === 'string' && json.coverColor.length > 0 ? json.coverColor : '#1a1a1a',
      num(json.mtimeMs) ?? 0,
    )
  }

  toJSON (): TrackJSON {
    return {
      id:          this.id,
      path:        this.path,
      title:       this.title,
      artist:      this.artist,
      album:       this.album,
      albumArtist: this.albumArtist,
      duration:    this.duration,
      format:      this.format,
      size:        this.size,
      year:        this.year,
      genre:       this.genre,
      trackNumber: this.trackNumber,
      discNumber:  this.discNumber,
      rating:      this.rating,
      bpm:         this.bpm,
      comment:     this.comment,
      lyrics:      this.lyrics,
      bitrate:     this.bitrate,
      sampleRate:  this.sampleRate,
      channels:    this.channels,
      artId:       this.artId,
      coverColor:  this.coverColor,
      mtimeMs:     this.mtimeMs,
    }
  }

  with (patch: Partial<TrackJSON>): Track {
    return Track.fromJSON({ ...this.toJSON(), ...patch })
  }

  /** The title, or the filename when the file carries no tag for one. */
  get displayTitle (): string {
    return this.title.length > 0 ? this.title : filenameOf(this.path)
  }

  get hasArt (): boolean {
    return this.artId !== undefined && this.artId.length > 0
  }
}

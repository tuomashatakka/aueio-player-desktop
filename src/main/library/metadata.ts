/**
 * Reads one audio file's tags with `music-metadata`, falling back to
 * filename parsing when a tag (or the file) can't be read. Ports the
 * fallback heuristics of desktop-audio's `scanner-worker.ts` — filename
 * `Artist - Title`, a leading track number, a bracketed year, the parent
 * directory as album, and the cover-color hash — onto the `TrackJSON` shape.
 * See docs/plans/desktop-audio-migration.md §7 and L2.
 */
import path from 'node:path'
import * as mm from 'music-metadata'
import type { TrackJSON } from '../../shared/dto'


const YEAR_PATTERN           = /\b(19\d{2}|20\d{2})\b/
const YEAR_BRACKET_PATTERN   = /[[(](19\d{2}|20\d{2})[\])]/
const TRACK_NUMBER_PATTERN   = /^(\d{1,3})[.\s-]/
const LEADING_NUMBER_PATTERN = /^\d+\.?\s+/

export interface Picture {
  mime:  string
  bytes: Uint8Array
}

export interface ReadTrackResult {
  track:    TrackJSON
  picture?: Picture
}

export interface StatLike {
  size:    number
  mtimeMs: number
}

/**
 * Number of times {@link readTrack} has actually called `parseFile` (misses
 * — `music-metadata` never runs for those — don't count). Kept as module
 * state behind a getter (never a mutable export, which the lint config
 * forbids) so a scan-then-rescan test can assert the rescan reparses
 * nothing without spying across a `Worker` boundary.
 */
let parseFileCallCount = 0

export function getParseFileCallCount (): number {
  return parseFileCallCount
}

export function resetParseFileCallCount (): void {
  parseFileCallCount = 0
}

function extractYear (noExt: string): number | undefined {
  const match = YEAR_PATTERN.exec(noExt) ?? YEAR_BRACKET_PATTERN.exec(noExt)
  if (!match)
    return undefined

  const year = Number.parseInt(match[1] ?? match[0], 10)
  return Number.isNaN(year) ? undefined : year
}

function extractTrackNumber (noExt: string): number | undefined {
  const match = TRACK_NUMBER_PATTERN.exec(noExt)
  if (!match)
    return undefined

  const trackNumber = Number.parseInt(match[1] ?? '', 10)
  return Number.isNaN(trackNumber) ? undefined : trackNumber
}

type ParseTitleArtistReturnType = { title: string, artist: string }

function parseTitleArtist (noExt: string): ParseTitleArtistReturnType {
  const dashIndex = noExt.indexOf(' - ')
  if (dashIndex <= 0)
    return { title: noExt.replace(LEADING_NUMBER_PATTERN, '') || noExt, artist: 'Unknown Artist' }

  const rawTitle = noExt.slice(dashIndex + 3).trim()
  return {
    artist: noExt.slice(0, dashIndex).trim(),
    title:  rawTitle.replace(LEADING_NUMBER_PATTERN, '') || rawTitle,
  }
}

function generateCoverColor (title: string): string {
  const hash = Array.from(title).reduce((h, ch) =>
    Math.imul(h, 31) + ch.charCodeAt(0) | 0, 0)
  const hue = 280 + Math.abs(hash) % 80
  return `hsl(${hue}, 65%, 38%)`
}

/** Tags may carry several comment frames; keep them all, one per line. */
function commentText (comments: readonly { text?: string }[] | undefined): string | undefined {
  const text = comments
    ?.map(comment =>
      comment.text?.trim())
    .filter(Boolean)
    .join('\n')
  return text || undefined
}

/**
 * Prefer plain lyrics; fall back to flattening a synchronized (LRC-style)
 * frame, since a timestamped-only tag is still the song's words.
 */
function lyricsText (
  lyrics: readonly { text?: string, syncText?: readonly { text?: string }[] }[] | undefined
): string | undefined {
  for (const entry of lyrics ?? []) {
    const plain = entry.text?.trim()
    if (plain)
      return plain

    const synced = entry.syncText
      ?.map(line =>
        line.text?.trim())
      .filter(Boolean)
      .join('\n')
    if (synced)
      return synced
  }
  return undefined
}

function fallbackTrack (filePath: string, stat: StatLike): TrackJSON {
  const ext               = path.extname(filePath).toLowerCase()
  const noExt             = path.basename(filePath, ext)
  const parentDir         = path.basename(path.dirname(filePath))
  const { title, artist } = parseTitleArtist(noExt)
  const album             = parentDir !== '.' && parentDir !== '/' ? parentDir : 'Unknown Album'
  const year              = extractYear(noExt)
  const trackNumber       = extractTrackNumber(noExt)

  return {
    id:         filePath,
    path:       filePath,
    title,
    artist,
    album,
    duration:   0,
    format:     ext.replace('.', '').toUpperCase(),
    size:       stat.size,
    coverColor: generateCoverColor(title),
    mtimeMs:    stat.mtimeMs,
    ...year !== undefined ? { year } : {},
    ...trackNumber !== undefined ? { trackNumber } : {},
  }
}

/**
 * Reads one file's tags. Falls back to filename parsing when `music-metadata`
 * can't read the file at all; per-field fallbacks (title/artist from the
 * filename, year/track number from the filename) still apply even when
 * parsing succeeds but a tag is missing.
 */
export async function readTrack (filePath: string, stat: StatLike): Promise<ReadTrackResult> {
  const fallback = fallbackTrack(filePath, stat)

  let meta: mm.IAudioMetadata
  try {
    parseFileCallCount++
    meta = await mm.parseFile(filePath, { duration: true })
  }
  catch {
    return { track: fallback }
  }

  const common      = meta.common
  const title       = common.title || fallback.title
  const ratingValue = common.rating?.[0]?.rating
  const picture     = common.picture?.[0]

  const track: TrackJSON = {
    id:         filePath,
    path:       filePath,
    title,
    artist:     common.artist || fallback.artist,
    album:      common.album || fallback.album,
    duration:   Math.round(meta.format.duration ?? 0),
    format:     fallback.format,
    size:       stat.size,
    coverColor: generateCoverColor(title),
    mtimeMs:    stat.mtimeMs,
    ...common.albumartist ? { albumArtist: common.albumartist } : {},
    ...(common.year ?? fallback.year) !== undefined ? { year: common.year ?? fallback.year } : {},
    ...common.genre?.[0] ? { genre: common.genre[0] } : {},
    ...(common.track?.no ?? fallback.trackNumber) !== undefined
      ? { trackNumber: common.track?.no ?? fallback.trackNumber }
      : {},
    ...common.disk?.no !== null && common.disk?.no !== undefined ? { discNumber: common.disk.no } : {},
    ...ratingValue !== undefined ? { rating: mm.ratingToStars(ratingValue) } : {},
    ...common.bpm !== undefined ? { bpm: common.bpm } : {},
    ...commentText(common.comment) !== undefined ? { comment: commentText(common.comment) } : {},
    ...lyricsText(common.lyrics) !== undefined ? { lyrics: lyricsText(common.lyrics) } : {},
    ...meta.format.bitrate !== undefined ? { bitrate: Math.round(meta.format.bitrate) } : {},
    ...meta.format.sampleRate !== undefined ? { sampleRate: meta.format.sampleRate } : {},
    ...meta.format.numberOfChannels !== undefined ? { channels: meta.format.numberOfChannels } : {},
  }

  if (!picture)
    return { track }

  return { track, picture: { mime: picture.format, bytes: picture.data }}
}

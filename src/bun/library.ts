import { readdir, stat } from 'fs/promises'
import { join, extname, basename, dirname } from 'path'
import type { Track } from './rpc'
import type { TagsStore } from './tags'


const AUDIO_EXTENSIONS = new Set([
  '.mp3',
  '.m4a',
  '.flac',
  '.wav',
  '.ogg',
  '.aac',
  '.opus',
  '.webm',
  '.wma',
  '.aiff',
  '.aif',
])

const generateCoverColor = (title: string): string => {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i)
    hash |= 0
  }

  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 60%, 40%)`
}

// Try to extract year from common filename patterns:
// "2023 - Title", "Title (2023)", "Title [2023]", "2023_Title"
const extractYear = (noExt: string): number | undefined => {
  const m =
    noExt.match(/\b(19\d{2}|20\d{2})\b/) ??
    noExt.match(/[\[(](19\d{2}|20\d{2})[\])]/)
  if (!m)
    return undefined

  const y = Number.parseInt(m[1] ?? m[0], 10)
  return Number.isNaN(y) ? undefined : y
}

// Extract track number from leading digits: "01 Title", "12. Title", "03 - Title"
const extractTrackNumber = (noExt: string): number | undefined => {
  const m = noExt.match(/^(\d{1,3})[.\s-]/)
  if (!m)
    return undefined

  const n = Number.parseInt(m[1] ?? '', 10)
  return Number.isNaN(n) ? undefined : n
}

const parseBasicMeta = (
  filePath: string,
  size: number
): Omit<Track, 'path' | 'id'> => {
  const filename = basename(filePath)
  const noExt = basename(filePath, extname(filePath))

  // Try "Artist - Title" pattern
  const dashIdx = noExt.indexOf(' - ')
  let artist = 'Unknown Artist'
  let title = noExt
  let trackNumber: number | undefined

  if (dashIdx > 0) {
    artist = noExt.slice(0, dashIdx).trim()
    title = noExt.slice(dashIdx + 3).trim()
  }

  // Strip leading track numbers like "01 ", "01. "
  const stripped = title.replace(/^\d+\.?\s+/, '')
  if (stripped === title) {
    trackNumber = extractTrackNumber(title)
  }
  else {
    trackNumber = extractTrackNumber(title)
    title = stripped
  }

  // Use parent directory name as album hint
  const parentDir = basename(dirname(filePath))
  const album = parentDir !== '.' && parentDir !== '/' ? parentDir : 'Unknown Album'

  const year = extractYear(noExt)

  return {
    title,
    artist,
    album,
    duration:   0,
    size,
    coverColor: generateCoverColor(filename),
    ...year === undefined ? {} : { year },
    ...trackNumber === undefined ? {} : { trackNumber },
  }
}

export const scanLibrary = async (
  folders: readonly string[],
  tagOverrides: TagsStore = {}
): Promise<Track[]> => {
  // eslint-disable-next-line functional/prefer-readonly-type
  const tracks: Track[] = []
  const seen = new Set<string>()

  const walk = async (dir: string): Promise<void> => {
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      await Promise.all(
        entries.map(async entry => {
          const fullPath = join(dir, entry.name)
          if (entry.isDirectory()) {
            await walk(fullPath)
          }
          else if (
            entry.isFile() &&
            AUDIO_EXTENSIONS.has(extname(entry.name).toLowerCase()) &&
            !seen.has(fullPath)
          ) {
            seen.add(fullPath)
            try {
              const stats = await stat(fullPath)
              const meta = parseBasicMeta(fullPath, stats.size)
              const overrides = tagOverrides[fullPath] ?? {}
              tracks.push({ id: fullPath, path: fullPath, ...meta, ...overrides })
            }
            catch {
              // skip unreadable files
            }
          }
        })
      )
    }
    catch {
      // skip inaccessible directories
    }
  }

  await Promise.all(folders.map(walk))
  tracks.sort((a, b) =>
    a.title.localeCompare(b.title))
  return tracks
}

/**
 * `openLibrary` — the one object main talks to `library.db` through.
 *
 * All statements are prepared once, at open time, and reused; the database
 * is opened in `strict` mode so named parameters bind without a `$`/`:`/`@`
 * prefix in JS while the SQL keeps its `@name` placeholders. See
 * docs/plans/desktop-audio-migration.md §6 and L2.
 */
import { Database } from 'bun:sqlite'
import type { AnalysisJSON, PlaylistJSON, TagPatchJSON, TrackJSON } from '../../shared/dto'
import {
  migrate,
  rootScopeClause,
  updateTrackSql,
  upsertTrackSql,
} from './schema'


const PATCH_FIELD_TO_COLUMN: Record<keyof TagPatchJSON, string> = {
  title:       'title',
  artist:      'artist',
  album:       'album',
  albumArtist: 'album_artist',
  year:        'year',
  genre:       'genre',
  trackNumber: 'track_number',
  discNumber:  'disc_number',
  rating:      'rating',
  bpm:         'bpm',
  comment:     'comment',
  lyrics:      'lyrics',
}

export interface PageTracksParams {
  after?: string
  limit:  number
}

export interface PageTracksResult {
  tracks: TrackJSON[]
  next?:  string
  total:  number
}

export interface ArtworkRecord {
  mime:  string
  bytes: Uint8Array
}

export interface Library {
  pageTracks:   (params: PageTracksParams) => PageTracksResult
  mtimeOf:      (path: string) => number | undefined
  getByPath:    (path: string) => TrackJSON | undefined
  getById:      (id: string) => TrackJSON | undefined
  upsertTracks: (rows: readonly TrackJSON[]) => void
  patchTags:    (id: string, patch: TagPatchJSON) => TrackJSON
  forgetRoots:  (roots: readonly string[]) => { removed: number }
  pruneNotIn:   (roots: readonly string[], keepIds: readonly string[]) => string[]
  artwork: {
    has: (id: string) => boolean
    get: (id: string) => ArtworkRecord | undefined
    put: (id: string, mime: string, bytes: Uint8Array) => void
  }
  analysis: {
    get: (id: string, mtimeMs: number, version: number) => AnalysisJSON | undefined
    put: (id: string, mtimeMs: number, version: number, analysis: AnalysisJSON) => void
  }
  playlists: {
    list:   () => PlaylistJSON[]
    save:   (playlist: PlaylistJSON) => void
    delete: (id: string) => void
  }
  close: () => void
}

interface TrackRow {
  id:           string
  path:         string
  title:        string
  artist:       string
  album:        string
  album_artist: string | null
  duration:     number
  format:       string
  size:         number
  year:         number | null
  genre:        string | null
  track_number: number | null
  disc_number:  number | null
  rating:       number | null
  bpm:          number | null
  comment:      string | null
  lyrics:       string | null
  bitrate:      number | null
  sample_rate:  number | null
  channels:     number | null
  art_id:       string | null
  cover_color:  string
  mtime_ms:     number
}

/** DB row → `TrackJSON`: snake_case columns, `null` dropped rather than kept. */
function rowToTrack (row: TrackRow): TrackJSON {
  return {
    id:         row.id,
    path:       row.path,
    title:      row.title,
    artist:     row.artist,
    album:      row.album,
    ...row.album_artist !== null ? { albumArtist: row.album_artist } : {},
    duration:   row.duration,
    format:     row.format,
    size:       row.size,
    ...row.year !== null ? { year: row.year } : {},
    ...row.genre !== null ? { genre: row.genre } : {},
    ...row.track_number !== null ? { trackNumber: row.track_number } : {},
    ...row.disc_number !== null ? { discNumber: row.disc_number } : {},
    ...row.rating !== null ? { rating: row.rating } : {},
    ...row.bpm !== null ? { bpm: row.bpm } : {},
    ...row.comment !== null ? { comment: row.comment } : {},
    ...row.lyrics !== null ? { lyrics: row.lyrics } : {},
    ...row.bitrate !== null ? { bitrate: row.bitrate } : {},
    ...row.sample_rate !== null ? { sampleRate: row.sample_rate } : {},
    ...row.channels !== null ? { channels: row.channels } : {},
    ...row.art_id !== null ? { artId: row.art_id } : {},
    coverColor: row.cover_color,
    mtimeMs:    row.mtime_ms,
  }
}

/** `TrackJSON` → every bound column, `undefined` collapsed to `null`. */
function trackToParams (track: TrackJSON): Record<string, string | number | null> {
  return {
    id:           track.id,
    path:         track.path,
    title:        track.title,
    artist:       track.artist,
    album:        track.album,
    album_artist: track.albumArtist ?? null,
    duration:     track.duration,
    format:       track.format,
    size:         track.size,
    year:         track.year ?? null,
    genre:        track.genre ?? null,
    track_number: track.trackNumber ?? null,
    disc_number:  track.discNumber ?? null,
    rating:       track.rating ?? null,
    bpm:          track.bpm ?? null,
    comment:      track.comment ?? null,
    lyrics:       track.lyrics ?? null,
    bitrate:      track.bitrate ?? null,
    sample_rate:  track.sampleRate ?? null,
    channels:     track.channels ?? null,
    art_id:       track.artId ?? null,
    cover_color:  track.coverColor,
    mtime_ms:     track.mtimeMs,
  }
}

/** A page cursor is the last row's `(title, id)` keyset, base64-encoded. */
function encodeCursor (row: TrackRow): string {
  return Buffer.from(JSON.stringify([ row.title, row.id ])).toString('base64')
}

type DecodeCursorReturnType = { title: string, id: string }

function decodeCursor (cursor: string): DecodeCursorReturnType {
  const [ title, id ] = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as [string, string]
  return { title, id }
}

/** Opens (creating and migrating if needed) the library database at `location`. */
export function openLibrary (location: string): Library {
  const db = new Database(location, { strict: true })
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA synchronous = NORMAL')
  migrate(db)

  const stmtPageFirst = db.query<TrackRow, { limit: number }>(
    'SELECT * FROM tracks ORDER BY title COLLATE NOCASE ASC, id ASC LIMIT @limit'
  )
  const stmtPageAfter = db.query<TrackRow, { afterTitle: string, afterId: string, limit: number }>(
    `SELECT * FROM tracks
     WHERE title COLLATE NOCASE > @afterTitle
        OR (title COLLATE NOCASE = @afterTitle AND id > @afterId)
     ORDER BY title COLLATE NOCASE ASC, id ASC
     LIMIT @limit`
  )
  const stmtCount     = db.query<{ count: number }, []>('SELECT COUNT(*) AS count FROM tracks')
  const stmtGetMtime  = db.query<{ mtime_ms: number }, { path: string }>('SELECT mtime_ms FROM tracks WHERE path = @path')
  const stmtGetByPath = db.query<TrackRow, { path: string }>('SELECT * FROM tracks WHERE path = @path')
  const stmtGetById   = db.query<TrackRow, { id: string }>('SELECT * FROM tracks WHERE id = @id')
  const stmtUpsert    = db.query<never, Record<string, string | number | null>>(upsertTrackSql())

  const stmtArtworkHas = db.query<{ found: number }, { id: string }>('SELECT 1 AS found FROM artwork WHERE id = @id')
  const stmtArtworkGet = db.query<ArtworkRecord, { id: string }>('SELECT mime, bytes FROM artwork WHERE id = @id')
  const stmtArtworkPut = db.query<never, { id: string, mime: string, bytes: Uint8Array }>(
    'INSERT INTO artwork (id, mime, bytes) VALUES (@id, @mime, @bytes) ON CONFLICT(id) DO NOTHING'
  )

  const stmtAnalysisGet = db.query<{ json: string }, { id: string, mtimeMs: number, version: number }>(
    'SELECT json FROM track_analysis WHERE track_id = @id AND source_mtime_ms = @mtimeMs AND version = @version'
  )
  const stmtAnalysisPut = db.query<never, { id: string, mtimeMs: number, version: number, json: string }>(
    `INSERT INTO track_analysis (track_id, source_mtime_ms, version, json)
     VALUES (@id, @mtimeMs, @version, @json)
     ON CONFLICT(track_id) DO UPDATE SET
       source_mtime_ms = excluded.source_mtime_ms,
       version = excluded.version,
       json = excluded.json`
  )

  const stmtPlaylistsList = db.query<{ json: string }, []>('SELECT json FROM playlists')
  const stmtPlaylistSave  = db.query<never, { id: string, json: string }>(
    'INSERT INTO playlists (id, json) VALUES (@id, @json) ON CONFLICT(id) DO UPDATE SET json = excluded.json'
  )
  const stmtPlaylistDelete = db.query<never, { id: string }>('DELETE FROM playlists WHERE id = @id')

  const upsertMany = db.transaction((rows: readonly TrackJSON[]) => {
    for (const track of rows)
      stmtUpsert.run(trackToParams(track))
  })

  function getByIdOrThrow (id: string): TrackJSON {
    const row = stmtGetById.get({ id })
    if (!row)
      throw new Error(`patchTags: no track with id ${id}`)
    return rowToTrack(row)
  }

  function pageTracks ({ after, limit }: PageTracksParams): PageTracksResult {
    const take   = Math.max(1, limit)
    const cursor = after ? decodeCursor(after) : undefined
    const rows   = cursor
      ? stmtPageAfter.all({ afterTitle: cursor.title, afterId: cursor.id, limit: take + 1 })
      : stmtPageFirst.all({ limit: take + 1 })

    const hasNext = rows.length > take
    const page    = hasNext ? rows.slice(0, take) : rows
    const total   = stmtCount.get()?.count ?? 0

    return {
      tracks: page.map(rowToTrack),
      ...hasNext ? { next: encodeCursor(page[page.length - 1]!) } : {},
      total,
    }
  }

  function patchTags (id: string, patch: TagPatchJSON): TrackJSON {
    const entries = Object.entries(patch) as [keyof TagPatchJSON, string | number | undefined][]
    if (entries.length === 0)
      return getByIdOrThrow(id)

    const columns = entries.map(([ field ]) =>
      PATCH_FIELD_TO_COLUMN[field])
    const params: Record<string, string | number | null> = { id }
    for (const [ field, value ] of entries)
      params[PATCH_FIELD_TO_COLUMN[field]] = value ?? null

    db.query<never, typeof params>(updateTrackSql(columns)).run(params)
    return getByIdOrThrow(id)
  }

  type ForgetRootsReturnType = { removed: number }

  function forgetRoots (roots: readonly string[]): ForgetRootsReturnType {
    const scope  = rootScopeClause(roots)
    const result = db.run(`DELETE FROM tracks WHERE (${scope.sql})`, scope.params)
    return { removed: result.changes }
  }

  function pruneNotIn (roots: readonly string[], keepIds: readonly string[]): string[] {
    const scope     = rootScopeClause(roots)
    const keepJson  = JSON.stringify(keepIds)
    const selectSql = `SELECT id FROM tracks WHERE (${scope.sql}) AND id NOT IN (SELECT value FROM json_each(?))`
    const ids       = db.query<{ id: string }, string[]>(selectSql)
      .all(...scope.params, keepJson)
      .map(row =>
        row.id)

    if (ids.length > 0)
      db.run('DELETE FROM tracks WHERE id IN (SELECT value FROM json_each(?))', [ JSON.stringify(ids) ])

    return ids
  }

  return {
    pageTracks,
    mtimeOf: (path: string) =>
      stmtGetMtime.get({ path })?.mtime_ms,
    getByPath: (path: string) => {
      const row = stmtGetByPath.get({ path })
      return row ? rowToTrack(row) : undefined
    },
    getById: (id: string) => {
      const row = stmtGetById.get({ id })
      return row ? rowToTrack(row) : undefined
    },
    upsertTracks: (rows: readonly TrackJSON[]) =>
      upsertMany(rows),
    patchTags,
    forgetRoots,
    pruneNotIn,
    artwork: {
      has: (id: string) =>
        stmtArtworkHas.get({ id }) !== null,
      get: (id: string) => {
        const row = stmtArtworkGet.get({ id })
        return row ? { mime: row.mime, bytes: row.bytes } : undefined
      },
      put: (id: string, mime: string, bytes: Uint8Array) =>
        void stmtArtworkPut.run({ id, mime, bytes }),
    },
    analysis: {
      get: (id: string, mtimeMs: number, version: number) => {
        const row = stmtAnalysisGet.get({ id, mtimeMs, version })
        return row ? JSON.parse(row.json) as AnalysisJSON : undefined
      },
      put: (id: string, mtimeMs: number, version: number, analysis: AnalysisJSON) =>
        void stmtAnalysisPut.run({ id, mtimeMs, version, json: JSON.stringify(analysis) }),
    },
    playlists: {
      list: () =>
        stmtPlaylistsList.all().map(row =>
          JSON.parse(row.json) as PlaylistJSON),
      save: (playlist: PlaylistJSON) =>
        void stmtPlaylistSave.run({ id: playlist.id, json: JSON.stringify(playlist) }),
      delete: (id: string) =>
        void stmtPlaylistDelete.run({ id }),
    },
    close: () =>
      db.close(),
  }
}

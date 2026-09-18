/**
 * The one description of the `tracks`, `artwork`, `track_analysis` and
 * `playlists` tables, and the SQL-building helpers that derive from it.
 *
 * Ports the *ideas* of desktop-audio's `track-schema.ts` (a single column
 * map drives `CREATE TABLE`, `migrate`, the upsert and the snake↔camel
 * mapping, so a new tag field is a one-line change) and `analysis-schema.ts`
 * (a sibling table plus a delete trigger so analysis never outlives its
 * track) onto `bun:sqlite`. See docs/plans/desktop-audio-migration.md §6 and
 * L2, and `db/repository.ts` for the object that actually uses these.
 */
import type { Database } from 'bun:sqlite'


/** Column name → SQLite type, in declaration order. One row per `TrackJSON` field. */
export const TRACK_COLUMNS: Record<string, string> = {
  id:           'TEXT PRIMARY KEY',
  path:         'TEXT NOT NULL',
  title:        'TEXT NOT NULL',
  artist:       'TEXT NOT NULL',
  album:        'TEXT NOT NULL',
  album_artist: 'TEXT',
  duration:     'REAL NOT NULL DEFAULT 0',
  format:       'TEXT NOT NULL DEFAULT \'\'',
  size:         'INTEGER NOT NULL DEFAULT 0',
  year:         'INTEGER',
  genre:        'TEXT',
  track_number: 'INTEGER',
  disc_number:  'INTEGER',
  rating:       'INTEGER',
  bpm:          'REAL',
  comment:      'TEXT',
  lyrics:       'TEXT',
  bitrate:      'INTEGER',
  sample_rate:  'INTEGER',
  channels:     'INTEGER',
  art_id:       'TEXT',
  cover_color:  'TEXT NOT NULL DEFAULT \'\'',
  mtime_ms:     'INTEGER NOT NULL DEFAULT 0',
}

export const TRACK_COLUMN_NAMES = Object.keys(TRACK_COLUMNS)

const CAMEL_BY_COLUMN = new Map(TRACK_COLUMN_NAMES.map(column =>
  [ column, toCamel(column) ]))

export interface RootScope {
  sql:    string
  params: string[]
}

interface TableInfoRow {
  name: string
}

/** `album_artist` → `albumArtist`. */
export function toCamel (column: string): string {
  return column.replace(/_([a-z])/g, (_, c: string) =>
    c.toUpperCase())
}

/** `albumArtist` → `album_artist`. */
export function toSnake (field: string): string {
  return field.replace(/[A-Z]/g, c =>
    `_${c.toLowerCase()}`)
}

/**
 * `WHERE` fragment matching every row that lives under one of `roots`. A
 * root matches itself or anything beneath it. Empty `roots` yields `0`, not
 * an empty string: a scope clause that vanishes would turn `DELETE FROM
 * tracks WHERE …` into an unconditional delete, and this is used on exactly
 * that statement (see `repository.ts`'s `forgetRoots`/`pruneNotIn`).
 */
export function rootScopeClause (roots: readonly string[]): RootScope {
  if (roots.length === 0)
    return { sql: '0', params: []}

  return {
    sql: roots.map(() =>
      '(path = ? OR path LIKE ? || \'/%\')').join(' OR '),
    params: roots.flatMap(root =>
      [ root, root ]),
  }
}

export function createTracksTableSql (): string {
  const columns = TRACK_COLUMN_NAMES.map(name =>
    `  ${name} ${TRACK_COLUMNS[name]}`).join(',\n')

  return `CREATE TABLE IF NOT EXISTS tracks (\n${columns}\n);\n` +
    'CREATE INDEX IF NOT EXISTS idx_tracks_path ON tracks(path);'
}

export function createArtworkTableSql (): string {
  return 'CREATE TABLE IF NOT EXISTS artwork (\n' +
    '  id TEXT PRIMARY KEY,\n' +
    '  mime TEXT NOT NULL,\n' +
    '  bytes BLOB NOT NULL\n' +
    ');'
}

// Analysis is its own table, not a track column: a chord map can be thousands
// of values, and carrying it through every `pageTracks` row would recreate
// the album-art memory problem in a new hat. The trigger keeps it from
// outliving the track it describes.
export function createAnalysisTableSql (): string {
  return `CREATE TABLE IF NOT EXISTS track_analysis (
  track_id TEXT PRIMARY KEY,
  source_mtime_ms INTEGER NOT NULL,
  version INTEGER NOT NULL,
  json TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS delete_track_analysis
AFTER DELETE ON tracks
BEGIN
  DELETE FROM track_analysis WHERE track_id = OLD.id;
END;`
}

export function createPlaylistsTableSql (): string {
  return 'CREATE TABLE IF NOT EXISTS playlists (\n' +
    '  id TEXT PRIMARY KEY,\n' +
    '  json TEXT NOT NULL\n' +
    ');'
}

/**
 * Creates every table on a fresh database and adds any `tracks` column the
 * running build knows about but the on-disk database doesn't. SQLite has no
 * `ADD COLUMN IF NOT EXISTS`, so the existing columns are read back from
 * `PRAGMA table_info` first — cheaper and less fragile than swallowing the
 * error from a duplicate add. Idempotent: calling it twice is a no-op.
 */
export function migrate (db: Database): void {
  db.exec(createTracksTableSql())
  db.exec(createArtworkTableSql())
  db.exec(createAnalysisTableSql())
  db.exec(createPlaylistsTableSql())

  const existing = new Set(
    db.query<TableInfoRow, []>('PRAGMA table_info(tracks)').all()
      .map(row =>
        row.name)
  )

  for (const name of TRACK_COLUMN_NAMES) {
    if (existing.has(name))
      continue

    // A PK/NOT NULL-without-default column can't be added after the fact;
    // only the nullable tag columns ever reach this path in practice.
    const type = TRACK_COLUMNS[name]!.replace(' PRIMARY KEY', '').replace('NOT NULL', '')
    db.exec(`ALTER TABLE tracks ADD COLUMN ${name} ${type}`)
  }
}

/** `INSERT … ON CONFLICT DO UPDATE` over every track column, including `mtime_ms`. */
export function upsertTrackSql (): string {
  const assignments = TRACK_COLUMN_NAMES
    .filter(name =>
      name !== 'id')
    .map(name =>
      `    ${name} = excluded.${name}`)
    .join(',\n')

  return `INSERT INTO tracks (${TRACK_COLUMN_NAMES.join(', ')})
  VALUES (${TRACK_COLUMN_NAMES.map(name =>
    `@${name}`).join(', ')})
  ON CONFLICT(id) DO UPDATE SET\n${assignments}`
}

/**
 * A plain `UPDATE` over only the columns a tag-editor patch carries.
 * Deliberately excludes `mtime_ms` (and every other column): it still
 * reflects the file on disk, so the next scan sees "unchanged", serves the
 * stored row, and the edit survives instead of being re-parsed away.
 */
export function updateTrackSql (columns: readonly string[]): string {
  const assignments = columns.map(name =>
    `${name} = @${name}`).join(', ')

  return `UPDATE tracks SET ${assignments} WHERE id = @id`
}

/** DB row (snake_case) → plain object with camelCase keys; `null` is dropped. */
export function rowToCamel (row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [ column, field ] of CAMEL_BY_COLUMN) {
    const value = row[column]
    if (value !== null && value !== undefined)
      out[field] = value
  }
  return out
}

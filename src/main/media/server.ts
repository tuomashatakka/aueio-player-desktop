/**
 * The local HTTP server media and artwork bytes travel over — never the RPC
 * channel (see `shared/rpc.ts`'s module docstring). Ids are resolved through
 * the library, never taken as raw paths; a per-launch token gates every
 * request. See docs/plans/desktop-audio-migration.md §5 and L2.
 */
import path from 'node:path'
import { MIME_BY_EXTENSION } from '../../shared/constants'
import { parseRange } from './range'


const ART_CACHE_CONTROL  = 'private, max-age=31536000, immutable'
const MEDIA_PATH_PATTERN = /^\/media\/([^/]+)$/
const ART_PATH_PATTERN   = /^\/art\/([^/]+)$/

export interface ResolvedArt {
  mime:  string
  bytes: Uint8Array
}

export interface MediaServerOptions {
  resolvePath: (id: string) => string | null
  resolveArt:  (artId: string) => ResolvedArt | null
}

export interface MediaServer {
  origin: string
  token:  string
  stop:   () => void
}

function mimeForPath (filePath: string): string {
  return MIME_BY_EXTENSION[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

function baseHeaders (mime: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Content-Type':                mime,
    'Accept-Ranges':               'bytes',
    'Access-Control-Allow-Origin': '*',
    ...extra,
  }
}

/** Serves a whole-or-ranged response over a byte length known up front. */
function rangedResponse (
  size: number,
  rangeHeader: string | null,
  mime: string,
  body: (start: number, end: number) => BodyInit,
  extraHeaders: Record<string, string> = {}
): Response {
  const range = parseRange(rangeHeader, size)

  if (range.kind === 'unsatisfiable')
    return new Response(null, {
      status:  416,
      headers: baseHeaders(mime, { ...extraHeaders, 'Content-Range': `bytes */${size}` }),
    })

  if (range.kind === 'satisfiable') {
    const length = range.end - range.start + 1
    return new Response(body(range.start, range.end), {
      status:  206,
      headers: baseHeaders(mime, {
        ...extraHeaders,
        'Content-Range':  `bytes ${range.start}-${range.end}/${size}`,
        'Content-Length': String(length),
      }),
    })
  }

  return new Response(body(0, size - 1), {
    status:  200,
    headers: baseHeaders(mime, { ...extraHeaders, 'Content-Length': String(size) }),
  })
}

async function serveFile (filePath: string, rangeHeader: string | null): Promise<Response> {
  const file = Bun.file(filePath)
  if (!await file.exists())
    return new Response('Not Found', { status: 404 })

  return rangedResponse(file.size, rangeHeader, mimeForPath(filePath), (start, end) =>
    file.slice(start, end + 1))
}

function serveArt (art: ResolvedArt, rangeHeader: string | null): Response {
  return rangedResponse(art.bytes.byteLength, rangeHeader, art.mime, (start, end) =>
    art.bytes.slice(start, end + 1), { 'Cache-Control': ART_CACHE_CONTROL })
}

/** Starts the server on an OS-assigned loopback port and returns its origin and token. */
export function startMediaServer (options: MediaServerOptions): MediaServer {
  const token = crypto.randomUUID().replace(/-/g, '')

  const server = Bun.serve({
    hostname: '127.0.0.1',
    port:     0,
    fetch:    async (request: Request): Promise<Response> => {
      const url = new URL(request.url)
      if (url.searchParams.get('t') !== token)
        return new Response('Forbidden', { status: 403 })

      const rangeHeader = request.headers.get('range')

      const mediaMatch = MEDIA_PATH_PATTERN.exec(url.pathname)
      if (mediaMatch) {
        const filePath = options.resolvePath(decodeURIComponent(mediaMatch[1]!))
        return filePath ? serveFile(filePath, rangeHeader) : new Response('Not Found', { status: 404 })
      }

      const artMatch = ART_PATH_PATTERN.exec(url.pathname)
      if (artMatch) {
        const art = options.resolveArt(decodeURIComponent(artMatch[1]!))
        return art ? serveArt(art, rangeHeader) : new Response('Not Found', { status: 404 })
      }

      return new Response('Not Found', { status: 404 })
    },
  })

  return {
    origin: `http://127.0.0.1:${server.port}`,
    token,
    stop:   () =>
      server.stop(true),
  }
}

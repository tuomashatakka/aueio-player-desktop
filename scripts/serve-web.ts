/**
 * Static file server for `build/web`, with `Range` support for audio
 * fixtures (206 partial content) and an SPA fallback to `index.html` for
 * `/`. Used by Playwright's `webServer` and by `screenshots.ts`.
 */
import { join, normalize } from 'node:path'


const root = join(import.meta.dir, '..', 'build/web')
const port = Number(process.env.PORT ?? 4173)

const MIME_TYPES: Record<string, string> = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'text/javascript; charset=utf-8',
  '.css':   'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png':   'image/png',
  '.wav':   'audio/wav',
  '.mp3':   'audio/mpeg',
  '.json':  'application/json; charset=utf-8',
  '.map':   'application/json; charset=utf-8',
}

function mimeFor (path: string): string {
  const dot = path.lastIndexOf('.')
  const ext = dot === -1 ? '' : path.slice(dot)

  return MIME_TYPES[ext] ?? 'application/octet-stream'
}

function resolvePath (pathname: string): string {
  const decoded = decodeURIComponent(pathname)
  const clean   = normalize(decoded).replace(/^([.][.][/\\])+/, '')

  return clean === '/' || clean === '' ? 'index.html' : clean.replace(/^\//, '')
}

async function serveFile (file: string, request: Request): Promise<Response> {
  const bunFile = Bun.file(file)
  const exists  = await bunFile.exists()

  if (!exists)
    return new Response('not found', { status: 404 })

  const size  = bunFile.size
  const mime  = mimeFor(file)
  const range = request.headers.get('range')

  if (range) {
    const match = (/bytes=(\d*)-(\d*)/).exec(range)
    const start = match?.[1] ? Number(match[1]) : 0
    const end   = match?.[2] ? Number(match[2]) : size - 1

    return new Response(bunFile.slice(start, end + 1), {
      status:  206,
      headers: {
        'Content-Type':   mime,
        'Content-Range':  `bytes ${start}-${end}/${size}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': String(end - start + 1),
      },
    })
  }

  return new Response(bunFile, {
    headers: {
      'Content-Type':  mime,
      'Accept-Ranges': 'bytes',
    },
  })
}

function main (): void {
  const server = Bun.serve({
    port,
    async fetch (request) {
      const url      = new URL(request.url)
      const relative = resolvePath(url.pathname)
      const file     = join(root, relative)

      if (!file.startsWith(root))
        return new Response('forbidden', { status: 403 })

      const direct = await serveFile(file, request)
      if (direct.status !== 404)
        return direct

      if (url.pathname === '/')
        return serveFile(join(root, 'index.html'), request)

      return direct
    },
  })

  console.log(`serving ${root} on http://localhost:${server.port}`)
}

main()

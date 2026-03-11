import { chromium } from '@playwright/test'
import http from 'http'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_DIR = path.join(__dirname, 'src/app')

const server = http.createServer((req, res) => {
  const safePath = (req.url || '/').split('?')[0] || '/'
  const file = path.join(APP_DIR, safePath === '/' ? 'index.html' : safePath)
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('Not found'); return }
  const ext = path.extname(file)
  const ct = {'.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css'}[ext] || 'application/octet-stream'
  res.writeHead(200, {'Content-Type': ct})
  fs.createReadStream(file).pipe(res)
})

const RPC_STUB = `
  window.__electrobunWebviewId = 1;
  window.__electrobunRpcSocketPort = 59999;
  window.__electrobun = { receiveMessageFromBun: () => {} };
  window.__electrobun_encrypt = async (msg) => ({ encryptedData: msg, iv: 'iv', tag: 'tag' });
  window.__electrobun_decrypt = async (data) => data;
  window.__electrobunBunBridge = { postMessage: () => {} };
  window.WebSocket = class MockWS {
    constructor(url) { this.readyState = 0; setTimeout(() => { this.readyState = 3; this.onerror?.({type:'error'}); }, 50); }
    addEventListener(ev, fn) { if (ev === 'error') this.onerror = fn; }
    send() {} close() {}
  };
`

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port
  console.log('Server on port', port)
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
    executablePath: '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome'
  })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.addInitScript(RPC_STUB)
  await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)

  const info = await page.evaluate(() => {
    const lo = document.getElementById('loading-overlay')
    const le = document.getElementById('library-empty')
    const tl = document.getElementById('track-list')
    const lv = document.getElementById('library-view')
    const root = document.getElementById('root')
    const errors = window.__appErrors || []
    return {
      rootHasChildren: root ? root.children.length : -1,
      loadingOverlay: lo ? { hasHiddenAttr: lo.hasAttribute('hidden'), computedDisplay: getComputedStyle(lo).display } : 'NOT FOUND',
      libraryEmpty: le ? { hasHiddenAttr: le.hasAttribute('hidden'), computedDisplay: getComputedStyle(le).display } : 'NOT FOUND',
      trackList: tl ? { hasHiddenAttr: tl.hasAttribute('hidden'), computedDisplay: getComputedStyle(tl).display, childCount: tl.children.length } : 'NOT FOUND',
      libraryView: lv ? { className: lv.className, computedDisplay: getComputedStyle(lv).display } : 'NOT FOUND',
      consoleErrors: errors,
    }
  })
  console.log('DOM state:', JSON.stringify(info, null, 2))

  const consoleErrs = []
  page.on('console', msg => { if (msg.type() === 'error') consoleErrs.push(msg.text()) })
  await browser.close()
  server.close()
})

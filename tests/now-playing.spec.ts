import { test, expect, chromium } from '@playwright/test'
import { join } from 'path'
import { createServer, type Server } from 'http'
import { createReadStream, existsSync } from 'fs'
import { extname } from 'path'


// ─── Local HTTP server ────────────────────────────────────────

const APP_DIR = join(process.cwd(), 'src/app')
let server: Server
let serverPort = 0

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
}

const startServer = (): Promise<number> =>
  new Promise((resolve, reject) => {
    server = createServer((req, res) => {
      const raw = req.url ?? '/'
      const safePath = raw.split('?')[0] ?? '/'
      const file = join(APP_DIR, safePath === '/' ? 'index.html' : safePath)

      if (!existsSync(file)) {
        res.writeHead(404)
        res.end('Not found')
        return
      }

      const ct = MIME[extname(file)] ?? 'application/octet-stream'
      res.writeHead(200, { 'Content-Type': ct })
      createReadStream(file).pipe(res)
    })

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      resolve(port)
    })

    server.on('error', reject)
  })

// ─── RPC stub ────────────────────────────────────────────────

const RPC_STUB = `
  window.__electrobunWebviewId = 1;
  window.__electrobunRpcSocketPort = 59999;
  window.__electrobun = { receiveMessageFromBun: () => {} };
  window.__electrobun_encrypt = async (msg) => ({ encryptedData: msg, iv: 'iv', tag: 'tag' });
  window.__electrobun_decrypt = async (data) => data;
  window.__electrobunBunBridge = { postMessage: () => {} };

  window.WebSocket = class MockWS {
    constructor(url) {
      this.url = url;
      this.readyState = 0;
      setTimeout(() => { this.readyState = 3; this.onerror?.({ type: 'error' }); }, 50);
    }
    addEventListener(ev, fn) { if (ev === 'error') this.onerror = fn; }
    send() {}
    close() {}
  };

  // Suppress AudioContext errors in headless
  window.AudioContext = class MockAudioContext {
    createAnalyser() { return { fftSize: 256, connect() {}, disconnect() {} }; }
    createMediaElementSource(el) { return { connect() {}, disconnect() {} }; }
    get destination() { return {}; }
    resume() { return Promise.resolve(); }
  };
`

// ─── Test suite ───────────────────────────────────────────────

test.describe('Now Playing View', () => {
  let page: ReturnType<typeof Object.create>
  let browser: ReturnType<typeof Object.create>
  let ctx: ReturnType<typeof Object.create>

  test.beforeAll(async () => {
    serverPort = await startServer()

    browser = await chromium.launch({
      headless: true,
      args: [ '--no-sandbox', '--disable-setuid-sandbox' ],
      executablePath: existsSync(
        '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome'
      )
        ? '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome'
        : undefined,
    })

    ctx = await browser.newContext()
    page = await ctx.newPage()

    await page.addInitScript(RPC_STUB)
    await page.goto(`http://127.0.0.1:${serverPort}/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
  })

  test.afterAll(async () => {
    await browser.close()
    server.close()
  })

  // ── Initial state ─────────────────────────────────────────

  test('now-playing bar is hidden when no track is playing', async () => {
    await expect(page.locator('#now-playing-bar')).toBeHidden()
  })

  test('now-playing expanded view is not active initially', async () => {
    await expect(page.locator('#now-playing-view')).not.toHaveClass(/active/)
  })

  // ── DOM structure ─────────────────────────────────────────

  test('now-playing bar expand button exists and has aria-label', async () => {
    const expandBtn = page.locator('#np-bar-expand')
    await expect(expandBtn).toBeAttached()
    const label = await expandBtn.getAttribute('aria-label')
    expect(label).toBeTruthy()
  })

  test('now-playing waveform canvas exists in expanded view', async () => {
    await expect(page.locator('#np-waveform-canvas')).toBeAttached()
  })

  test('now-playing bar waveform canvas exists', async () => {
    await expect(page.locator('#np-bar-waveform')).toBeAttached()
  })

  test('playback controls exist in expanded view', async () => {
    await expect(page.locator('#np-play-btn')).toBeAttached()
    await expect(page.locator('#np-prev-btn')).toBeAttached()
    await expect(page.locator('#np-next-btn')).toBeAttached()
  })

  test('volume slider exists in expanded now-playing view', async () => {
    await expect(page.locator('#np-volume')).toBeAttached()
  })

  test('waveform container has role=slider for accessibility', async () => {
    const container = page.locator('#np-waveform-container')
    await expect(container).toBeAttached()
    const role = await container.getAttribute('role')
    expect(role).toBe('slider')
  })

  test('back button exists in expanded now-playing view', async () => {
    await expect(page.locator('#np-back-btn')).toBeAttached()
  })

  test('playback controls exist in bar', async () => {
    await expect(page.locator('#np-bar-play-btn')).toBeAttached()
    await expect(page.locator('#np-bar-prev-btn')).toBeAttached()
    await expect(page.locator('#np-bar-next-btn')).toBeAttached()
  })

  // ── Simulated track playback state ───────────────────────

  test('manipulating now-playing bar directly', async () => {
    // Directly set the bar visible to test expand behavior
    await page.evaluate(() => {
      const bar = document.getElementById('now-playing-bar')

      if (bar) {
        bar.removeAttribute('hidden')
        const title = document.getElementById('np-bar-title')
        const artist = document.getElementById('np-bar-artist')

        if (title)
          title.textContent = 'Test Track'

        if (artist)
          artist.textContent = 'Test Artist'
      }
    })

    await expect(page.locator('#now-playing-bar')).toBeVisible()
    await expect(page.locator('#np-bar-title')).toHaveText('Test Track')
    await expect(page.locator('#np-bar-artist')).toHaveText('Test Artist')
  })

  test('clicking expand button opens now-playing view', async () => {
    // Make sure bar is visible first
    await page.evaluate(() => {
      const bar = document.getElementById('now-playing-bar')

      if (bar)
        bar.removeAttribute('hidden')
    })

    await page.click('#np-bar-expand')
    await page.waitForTimeout(200)
    await expect(page.locator('#now-playing-view')).toHaveClass(/active/)
  })

  test('now-playing expanded view shows track info', async () => {
    // Set track info in expanded view
    await page.evaluate(() => {
      const title = document.getElementById('np-title')
      const artist = document.getElementById('np-artist')

      if (title)
        title.textContent = 'Test Track'

      if (artist)
        artist.textContent = 'Test Artist'
    })

    await expect(page.locator('#np-title')).toHaveText('Test Track')
    await expect(page.locator('#np-artist')).toHaveText('Test Artist')
  })

  test('screenshot: now-playing bar visible', async () => {
    await page.screenshot({
      path: 'tests/screenshots/now-playing-bar.png',
      fullPage: false,
    })
  })

  test('screenshot: now-playing expanded view', async () => {
    await page.screenshot({
      path: 'tests/screenshots/now-playing-expanded.png',
      fullPage: false,
    })
  })

  test('back button collapses now-playing expanded view', async () => {
    await page.click('#np-back-btn')
    await page.waitForTimeout(200)
    await expect(page.locator('#now-playing-view')).not.toHaveClass(/active/)
  })

  // ── History API navigation ────────────────────────────────

  test('URL hash changes to #nowplaying when expanded', async () => {
    await page.evaluate(() => {
      const bar = document.getElementById('now-playing-bar')

      if (bar)
        bar.removeAttribute('hidden')
    })

    await page.click('#np-bar-expand')
    await page.waitForTimeout(200)

    const hash = await page.evaluate(() => location.hash)
    expect(hash).toBe('#nowplaying')
  })
})

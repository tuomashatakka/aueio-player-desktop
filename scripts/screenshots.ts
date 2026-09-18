/**
 * Screenshot baselines: one Chromium browser, one page, `?gateway=fake`.
 * Every shot is best-effort — a trigger that hasn't landed yet (`ui/` and
 * `effects/` are still being written concurrently, §16) is warned about and
 * skipped rather than failing the run.
 */
import { chromium } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'


const ROOT     = join(import.meta.dir, '..')
const BASE_URL = 'http://localhost:4173'
const OUT_DIR  = join(ROOT, 'docs/screenshots')
const TIMEOUT  = 2000

async function serverIsUp (): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/index.html`)
    return response.ok
  }
  catch {
    return false
  }
}

async function ensureServer (): Promise<(() => void) | null> {
  if (await serverIsUp())
    return null

  const proc = Bun.spawn([ 'bun', 'run', 'serve:web' ], { cwd: ROOT, stdout: 'ignore', stderr: 'inherit' })

  for (let attempt = 0; attempt < 50; attempt++) {
    if (await serverIsUp())
      return () => proc.kill()
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  proc.kill()
  throw new Error('serve:web did not come up in time')
}

async function shoot (page: Page, name: string, locator?: Locator): Promise<void> {
  const target = join(OUT_DIR, name)

  if (locator)
    await locator.screenshot({ path: target })
  else
    await page.screenshot({ path: target })

  console.log(`  ✓ ${name}`)
}

/** Runs `setup`, then shoots `name`; warns and skips on any failure (a missing trigger, most often). */
async function attempt (page: Page, name: string, setup: () => Promise<Locator | void>): Promise<void> {
  try {
    const locator = await setup()
    await shoot(page, name, locator ?? undefined)
  }
  catch (error) {
    console.warn(`  ⚠ skipped ${name}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function clickByName (page: Page, pattern: RegExp): Promise<void> {
  const target = page.getByRole('button', { name: pattern }).or(page.getByRole('radio', { name: pattern }))
    .first()
  await target.click({ timeout: TIMEOUT })
}

async function captureMainScreens (page: Page, suffix: string): Promise<void> {
  await attempt(page, `library-list${suffix}.png`, async () => {
    await page.waitForSelector('main[data-view]', { timeout: TIMEOUT })
  })

  if (suffix === '')
    await attempt(page, 'library-grid.png', async () => {
      await clickByName(page, /grid/i)
    })

  await attempt(page, `player-art${suffix}.png`, async () => {
    await clickByName(page, /now playing|expand|open player/i)
    await page.waitForSelector('section.player[data-expanded]', { state: 'visible', timeout: TIMEOUT })
  })

  if (suffix === '') {
    await attempt(page, 'player-analysis.png', async () => {
      await clickByName(page, /analysis|chords/i)
    })

    await attempt(page, 'player-lyrics.png', async () => {
      await clickByName(page, /lyrics/i)
    })

    await attempt(page, 'waveform.png', async () =>
      page.locator('footer .waveform').first())
  }

  await attempt(page, `dsp${suffix}.png`, async () => {
    await clickByName(page, /dsp|equalizer|audio processing/i)
    await page.waitForSelector('.dsp', { state: 'visible', timeout: TIMEOUT })
  })

  await attempt(page, `settings${suffix}.png`, async () => {
    await clickByName(page, /settings/i)
  })

  if (suffix === '')
    await attempt(page, 'tag-editor.png', async () => {
      // Earlier shots leave the expanded player open and the shell inert; start clean.
      await page.reload()
      await page.waitForSelector('tbody tr[data-track-id]', { timeout: TIMEOUT })

      const row = page.locator('tbody tr[data-track-id]').first()
      await row.click({ timeout: TIMEOUT })
      await row.focus()
      await page.keyboard.press('Control+i')

      const dialog = page.locator('dialog.tag-editor, dialog[open]').first()
      if (!await dialog.isVisible({ timeout: TIMEOUT }).catch(() => false))
        await page.keyboard.press('Meta+i')
      await page.waitForSelector('dialog.tag-editor, dialog[open]', { state: 'visible', timeout: TIMEOUT })
    })
}

async function main (): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true })

  const stopServer = await ensureServer()
  const browser    = await chromium.launch()

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })

    await page.goto(`${BASE_URL}/index.html?gateway=fake`)
    await page.waitForSelector('main[data-view]', { timeout: TIMEOUT }).catch(() => {})

    console.log('dark theme:')
    await captureMainScreens(page, '')

    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'light'
    })

    console.log('light theme:')
    await captureMainScreens(page, '-light')
  }
  finally {
    await browser.close()
    stopServer?.()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})

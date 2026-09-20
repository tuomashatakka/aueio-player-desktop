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


const ROOT      = join(import.meta.dir, '..')
const BASE_URL  = 'http://localhost:4173'
const OUT_DIR   = join(ROOT, 'docs/screenshots')
const TIMEOUT   = 2000
const SETTLE_MS = 600

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

  // `waitForSelector('…', { state: 'visible' })` resolves as soon as a
  // popover/dialog is attached and non-`display: none` — before its own
  // opacity/scale transition (base.css's `[popover]`/`dialog` open state)
  // has settled, so a shot taken immediately catches a part-faded frame
  // (most visible now that the expanded player covers the whole window:
  // a mid-fade frame shows the shell underneath faintly through it).
  //
  // Comfortably past `--duration-slow` (400ms), the longest transition any
  // of these surfaces runs — the DSP drawer's slide and the expanded
  // player's mode change both take that long.
  await page.waitForTimeout(SETTLE_MS)

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

/**
 * Switches to the light theme through the Settings screen, the way a user
 * would. Writing `documentElement.dataset.theme` here instead looks like it
 * works and then silently reverts: `effects/appearance.ts` is the sole
 * writer of `data-theme` (AGENTS.md's "One Writer for `--accent`") and
 * rewrites it from `settings.theme` on the next settings *or playback*
 * change — which starting a track is.
 */
async function selectLightTheme (page: Page): Promise<void> {
  try {
    await clickByName(page, /^settings$/i)
    await page.getByRole('radio', { name: /^light$/i }).first()
      .check({ timeout: TIMEOUT })
    await clickByName(page, /^library$/i)
    await page.waitForFunction(() =>
      document.documentElement.dataset.theme === 'light', undefined, { timeout: TIMEOUT })
  }
  catch (error) {
    console.warn(`  ⚠ could not switch to the light theme: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Starts the first track before any player shot is taken. Without it every
 * player baseline captures the `[data-empty]` state — no title, no artist,
 * a flat seek bar — which shows none of the layout those shots exist to
 * document. Best-effort, like `attempt`: a run that can't start playback
 * still captures the empty player rather than failing.
 */
async function playFirstTrack (page: Page): Promise<void> {
  try {
    await page.waitForSelector('tbody tr[data-track-id]', { timeout: TIMEOUT })
    await page.locator('tbody tr[data-track-id]').first()
      .dblclick({ timeout: TIMEOUT })

    // Scoped to the footer copy: the expanded wrapper never carries
    // `data-empty`, so an unscoped `:not([data-empty])` always matches.
    await page.waitForSelector('footer.player section.player:not([data-empty])', { timeout: TIMEOUT })
  }
  catch (error) {
    console.warn(`  ⚠ could not start playback: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function captureMainScreens (page: Page, suffix: string): Promise<void> {
  await attempt(page, `library-list${suffix}.png`, async () => {
    await page.waitForSelector('main[data-view]', { timeout: TIMEOUT })
  })

  await playFirstTrack(page)

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

  // The expanded player now covers the whole viewport (AGENTS.md's Now
  // Playing invariant) rather than docking past the sidebar, so it has to
  // close again before the sidebar's DSP/Settings doors are reachable —
  // same toggle button, `aria-pressed` just flips back to `false`. Best
  // effort, like `attempt`, but this step has no screenshot of its own.
  try {
    await clickByName(page, /now playing|expand|open player/i)
    await page.waitForSelector('section.player[data-expanded]', { state: 'hidden', timeout: TIMEOUT })
  }
  catch (error) {
    console.warn(`  ⚠ could not close the expanded player: ${error instanceof Error ? error.message : String(error)}`)
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
      await page.evaluate(() =>
        localStorage.clear())
      await page.reload()
      await page.waitForSelector('tbody tr[data-track-id]', { timeout: TIMEOUT })

      const row = page.locator('tbody tr[data-track-id]').first()
      await row.click({ timeout: TIMEOUT })
      await row.focus()
      await page.keyboard.press('Control+i')

      const dialog = page.locator('dialog.tag-editor, dialog[open]').first()
      if (!await dialog.isVisible({ timeout: TIMEOUT }).catch(() => false))
        await page.keyboard.press('Meta+i')
      await page.waitForSelector('dialog.tag-editor[open]', { state: 'visible', timeout: TIMEOUT })
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

    // The dark pass leaves dialogs and popovers open; start the light pass clean.
    await page.evaluate(() =>
      localStorage.clear())
    await page.reload()
    await page.waitForSelector('main[data-view]', { timeout: TIMEOUT }).catch(() => {})
    await selectLightTheme(page)

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

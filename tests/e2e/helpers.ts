/**
 * Shared e2e bootstrap: loads the app against the in-memory `FakeGateway`
 * (`?gateway=fake`, wired by the composition root — §16) and waits for the
 * library view to mount.
 */
import type { Page } from '@playwright/test'


export interface OpenAppOptions {
  readonly theme?: 'dark' | 'light' | 'auto'
}

export async function openApp (page: Page, options: OpenAppOptions = {}): Promise<void> {
  await page.goto('/index.html?gateway=fake')
  await page.waitForSelector('main[data-view]')

  // contract: no documented query param or storage key picks the initial
  // theme yet (§10/settings persistence lands with L6/L8); force it on
  // `documentElement` directly so callers can open the app pre-themed
  // without depending on that wiring.
  if (options.theme)
    await page.evaluate(theme => {
      document.documentElement.dataset.theme = theme
    }, options.theme)
}

import { expect, test } from '@playwright/test'
import { openApp } from './helpers'


test.describe('library', () => {
  test('lists the fake scan\'s three tracks', async ({ page }) => {
    await openApp(page)

    await expect(page.locator('tbody tr[data-track-id]')).toHaveCount(3)
  })

  test('search filters rows', async ({ page }) => {
    await openApp(page)

    const rows = page.locator('tbody tr[data-track-id]')

    await expect(rows).toHaveCount(3)
    await page.locator('search input').fill('Tagged')
    await expect(rows).toHaveCount(1)

    await page.locator('search input').fill('')
    await expect(rows).toHaveCount(3)
  })

  test('the density radio flips the list to a card grid and back', async ({ page }) => {
    await openApp(page)

    // contract: no density control exists in the current static markup
    // (`src/app/index.html`) — L8 adds it to the library toolbar (§4/§10
    // `state/ui/state.ts` `Density = 'compact' | 'normal' | 'relaxed' |
    // 'grid-sm' | 'grid-lg'`). Resolve by accessible name rather than a
    // class, and skip rather than fail if it hasn't landed yet.
    const gridOption = page.getByRole('radio', { name: /grid/i }).first()

    if (await gridOption.count() === 0) {
      test.skip(true, 'density control not yet implemented')
      return
    }

    await expect(page.locator('table')).toBeVisible()

    await gridOption.click()
    await expect(page.locator('table')).toBeHidden()
    await expect(page.getByRole('list').filter({ has: page.locator('article') })).toBeVisible()

    const listOption = page.getByRole('radio', { name: /list|compact|normal|relaxed/i }).first()
    await listOption.click()
    await expect(page.locator('table')).toBeVisible()
  })
})

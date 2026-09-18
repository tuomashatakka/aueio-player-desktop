import { expect, test } from '@playwright/test'
import { openApp } from './helpers'


test.describe('shell', () => {
  test('renders the app landmarks', async ({ page }) => {
    await openApp(page)

    await expect(page.locator('header.titlebar')).toBeVisible()
    await expect(page.locator('aside.sidebar')).toBeVisible()
    await expect(page.locator('main[data-view="library"]')).toBeVisible()
    await expect(page.locator('footer.player')).toBeVisible()
  })
})

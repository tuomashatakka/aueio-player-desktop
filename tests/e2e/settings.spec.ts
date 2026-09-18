import { expect, test } from '@playwright/test'
import { openApp } from './helpers'


test.describe('settings', () => {
  test('opens from the sidebar and exposes the theme fieldset', async ({ page }) => {
    await openApp(page)

    // contract: the sidebar's static markup (`src/app/index.html`) has no
    // settings entry yet — resolved by accessible name, not a class or
    // position, per L8/AGENTS.md.
    await page.getByRole('button', { name: /settings/i }).click()

    const appearance = page.getByRole('group', { name: /appearance/i })
      .or(page.locator('fieldset', { hasText: /appearance/i }))

    await expect(appearance.first()).toBeVisible()
  })

  test('choosing light sets html[data-theme="light"]', async ({ page }) => {
    await openApp(page)

    await page.getByRole('button', { name: /settings/i }).click()

    // contract: `src/app/index.html`'s static `.settings` dialog uses a
    // `<select>` of Auto/Dark/Light; L8 may render radios instead (§10's
    // `Theme = 'dark' | 'light' | 'auto' | 'custom'`) — try both.
    const select = page.locator('.settings select, dialog select').filter({ hasText: /light/i })
      .first()
    const radio  = page.getByRole('radio', { name: /^light$/i }).first()

    if (await select.count() > 0)
      await select.selectOption({ label: 'Light' })
    else
      await radio.click()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })
})

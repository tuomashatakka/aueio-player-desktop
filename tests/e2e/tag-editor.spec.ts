import { expect, test } from '@playwright/test'
import { openApp } from './helpers'


test.describe('tag editor', () => {
  test('mod+i opens the tag editor for the focused row', async ({ page }) => {
    await openApp(page)

    const firstRow = page.locator('tbody tr[data-track-id]').first()
    await firstRow.click()
    await firstRow.focus()

    // `mod+i` — `DEFAULT_KEYBINDINGS` in
    // `src/app/services/keybindings/defaults.ts` binds `edit-tags` to
    // `mod+i`; try both accelerators since the runner's platform decides
    // which one `mod` resolves to.
    await page.keyboard.press('Control+i')

    const dialog = page.locator('dialog.tag-editor, dialog[open]').first()

    if (!await dialog.isVisible().catch(() => false))
      await page.keyboard.press('Meta+i')

    await expect(dialog).toBeVisible()

    // contract: `src/app/index.html`'s static form has a `Title` label
    // with no `name`/`id`; resolve the field by its accessible label.
    await expect(dialog.getByLabel(/title/i)).toBeVisible()
  })
})

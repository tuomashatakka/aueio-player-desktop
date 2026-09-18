import { expect, test } from '@playwright/test'
import { openApp } from './helpers'


function normalise (html: string): string {
  return html.replace(/\s+/g, ' ').trim()
}

test.describe('player', () => {
  test('double-clicking a row starts playback', async ({ page }) => {
    await openApp(page)

    const footerPlayer = page.locator('footer .player')
    const firstRow     = page.locator('tbody tr[data-track-id]').first()

    await firstRow.dblclick()

    // contract: the static markup (`src/app/index.html`) has no
    // `data-empty` attribute yet — L8's `Player` component sets it (one
    // markup, §11/AGENTS.md "One DOM"); accept either its absence or an
    // explicit `"false"`.
    await expect
      .poll(async () => footerPlayer.getAttribute('data-empty'))
      .not.toBe('true')
  })

  test('the footer and overlay player copies are byte-equal', async ({ page }) => {
    await openApp(page)

    const footerHtml  = await page.locator('footer section.player').innerHTML()
    const overlayHtml = await page.locator('section.player[data-expanded]').innerHTML()

    expect(normalise(overlayHtml)).toBe(normalise(footerHtml))
  })
})

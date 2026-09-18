import { expect, test } from '@playwright/test'
import { openApp } from './helpers'


// `data-live` (`FrequencyMatrix`) is the one attribute the "One DOM"
// invariant lets `expanded` select — see AGENTS.md and the equivalent
// `stripLiveAttribute` in `tests/unit/app/ui/Player.test.tsx`, which this
// spec's byte-equal assertion below must agree with.
function normalise (html: string): string {
  return html.replace(/\s+/g, ' ').replace(/ data-live(="")?/g, '')
    .trim()
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

    // contract: `Shell` wraps the overlay copy in its own popover element,
    // which (per the "One DOM" invariant) also carries the `.player` class
    // — so `section.player[data-expanded]` is that wrapper, one level above
    // the `Player` component's own root, and `[data-expanded]` is what
    // singles it out from the nested copy. Its innerHTML is therefore the
    // *wrapper's* one child including that child's own tag, not the child's
    // contents — drill one level further in to compare the same node the
    // footer locator already reaches directly.
    const footerHtml  = await page.locator('footer section.player').innerHTML()
    const overlayHtml = await page.locator('section.player[data-expanded] > section.player').innerHTML()

    expect(normalise(overlayHtml)).toBe(normalise(footerHtml))
  })
})

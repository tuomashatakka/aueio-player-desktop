/**
 * Port of `afterPointerRelease` from `desktop-audio/src/app/utils/events.ts`.
 *
 * Runs `show` once the pointer gesture currently in flight has ended.
 *
 * A popover opened *during* a `contextmenu` event cannot survive the gesture
 * that opened it. Light dismiss records the clicked-popover target at
 * `pointerdown` -- when nothing was open yet, so it records `null` -- and at
 * the `pointerup` ending the same right-click the target outside the popover
 * resolves to `null` too. The two match, and everything open is hidden. The
 * menu is therefore shown and closed before it ever paints.
 *
 * Waiting the gesture out is what lets a pointer-opened menu stay up. A
 * keyboard-triggered menu (Shift+F10 or the Menu key) reports `buttons === 0`
 * and has no gesture to wait for, so it opens immediately.
 *
 * jsdom implements no light dismiss, so **no component test can catch a
 * regression here** -- it needs a real window. See AGENTS.md's Context Menus
 * section.
 */
export function afterPointerRelease (buttons: number, show: () => void): void {
  if (buttons === 0) {
    show()
    return
  }

  // `once` is why this is the native API rather than a disposable listener helper.
  window.addEventListener('pointerup', () =>
    show(), { once: true })
}

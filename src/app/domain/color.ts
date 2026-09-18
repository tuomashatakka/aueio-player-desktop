/**
 * Colour maths shared by the appearance and ambient-palette services.
 *
 * The app derives its accent from album artwork, which means the accent is no
 * longer something a designer picked against a known background — it's whatever
 * the record happens to be. `contrastLift` is the floor that stops an
 * artwork-derived accent from landing on top of an equally dark background.
 * Ported from desktop-audio/src/app/utils/color.ts.
 */

/** WCAG's sRGB→linear crossover point. */
const LINEAR_CUTOFF = 0.03928

/** Rec. 709 luminance weights, as WCAG 2 specifies them. */
const LUMA_R = 0.2126
const LUMA_G = 0.7152
const LUMA_B = 0.0722

/**
 * The contrast floor an artwork-derived accent has to clear against the page
 * background. 3:1 is WCAG's bar for large text and UI components.
 */
export const ACCENT_CONTRAST_TARGET = 3

/** How far each lift step moves toward the extreme, and how many are allowed. */
const LIFT_STEP     = 0.08
const LIFT_MAX_ITER = 16

/** Above this luminance a background counts as light, so accents darken. */
const LIGHT_BG_LUMINANCE = 0.4

const HEX_SHORT   = 3
const HEX_FULL    = 6
const CHANNEL_MAX = 255

/** A colour as 0–255 channels. */
export type Rgb = readonly [number, number, number]

/**
 * Parses `#rgb`, `#rrggbb`, `rgb(r g b)` and `rgb(r, g, b)`.
 * Returns `null` for anything else — notably `color-mix()`, which a computed
 * custom property can legitimately still contain. Callers treat that as
 * "unknown" rather than guessing.
 */
export function parseColor (value: string): Rgb | null {
  const input = value.trim()

  if (input.startsWith('#')) {
    const hex  = input.slice(1)
    const full = hex.length === HEX_SHORT
      ? hex.split('').map(c =>
        c + c)
        .join('')
      : hex

    if (full.length < HEX_FULL)
      return null

    const r = Number.parseInt(full.slice(0, 2), 16)
    const g = Number.parseInt(full.slice(2, 4), 16)
    const b = Number.parseInt(full.slice(4, 6), 16)
    return Number.isNaN(r + g + b) ? null : [ r, g, b ]
  }

  const match = (/^rgba?\(([^)]+)\)$/i).exec(input)
  if (!match)
    return null

  const parts = (match[1] ?? '').split(/[\s,/]+/).filter(Boolean)
    .slice(0, 3)
    .map(Number)

  return parts.length === 3 && parts.every(n =>
    !Number.isNaN(n))
    ? [ parts[0]!, parts[1]!, parts[2]! ]
    : null
}

/** Serialises back to the space-separated `rgb()` form the stylesheet uses. */
export function toCss ([ r, g, b ]: Rgb): string {
  return `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`
}

/** One channel, sRGB 0–255 → linear 0–1. */
function toLinear (channel: number): number {
  const c = channel / CHANNEL_MAX
  return c <= LINEAR_CUTOFF ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance ([ r, g, b ]: Rgb): number {
  return LUMA_R * toLinear(r) + LUMA_G * toLinear(g) + LUMA_B * toLinear(b)
}

/** WCAG contrast ratio between two colours, 1–21. Order-independent. */
export function contrastRatio (a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Moves `colour` a fraction of the way toward `target`. */
function mix ([ r, g, b ]: Rgb, target: Rgb, amount: number): Rgb {
  return [
    r + (target[0] - r) * amount,
    g + (target[1] - g) * amount,
    b + (target[2] - b) * amount,
  ]
}

/**
 * Brightens (or, on a light background, darkens) `colour` until it clears
 * `target` contrast against `background`.
 *
 * Walks in fixed steps toward white or black rather than solving for the exact
 * lightness, because the step that first clears the bar is the one that changes
 * the artwork's hue least. Gives up after `LIFT_MAX_ITER` and returns the best
 * it managed, which is still strictly more legible than where it started.
 */
export function contrastLift (
  colour: Rgb,
  background: Rgb,
  target: number = ACCENT_CONTRAST_TARGET,
): Rgb {
  if (contrastRatio(colour, background) >= target)
    return colour

  // Push away from the background, not toward a fixed pole: a mid-grey accent
  // on a mid-grey page has to pick a direction, and the one with more headroom
  // is the one that can actually get there.
  const extreme: Rgb = relativeLuminance(background) > LIGHT_BG_LUMINANCE
    ? [ 0, 0, 0 ]
    : [ CHANNEL_MAX, CHANNEL_MAX, CHANNEL_MAX ]

  let lifted = colour

  for (let i = 0; i < LIFT_MAX_ITER; i++) {
    lifted = mix(lifted, extreme, LIFT_STEP)
    if (contrastRatio(lifted, background) >= target)
      break
  }

  return lifted
}

/**
 * The single writer of `data-theme`, `--accent`, `--accent-contrast`,
 * `--art-*` and root `font-size` (see AGENTS.md's "One Writer for
 * `--accent`"). Driven by settings (theme/accentSource/accentColor/
 * fontScale) and the current track's artwork; coalesced to one write per
 * frame however many of those changed at once.
 */
import { contrastLift, parseColor, relativeLuminance, toCss } from '../domain/color'
import type { Rgb } from '../domain/color'
import { paletteFromImage } from '../services/palette/extract'
import type { ArtPalette } from '../services/palette/extract'
import { artUrl } from './media'
import { scheduleFrame } from './frame'
import type { Dispose, Effect } from './services'


const DEFAULT_BACKGROUND: Rgb = [ 15, 15, 17 ]
const DEFAULT_ACCENT:     Rgb = [ 0, 229, 209 ]
const DARK_TEXT:          Rgb = [ 15, 15, 17 ]
const LIGHT_TEXT:         Rgb = [ 255, 255, 255 ]

const BASE_FONT_SIZE_PX = 16
const CONTRAST_MIDPOINT = 0.5

function resolveTheme (theme: 'dark' | 'light' | 'auto'): 'dark' | 'light' {
  if (theme !== 'auto')
    return theme
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

function backgroundFor (root: HTMLElement): Rgb {
  if (typeof getComputedStyle === 'function') {
    const surface = parseColor(getComputedStyle(root).getPropertyValue('--surface'))
    if (surface)
      return surface
  }
  return DEFAULT_BACKGROUND
}

export const appearance: Effect = (stores, services) => {
  let disposed                      = false
  let cancelFrame: Dispose | null   = null
  let paletteTrackId: string | null = null
  let palette: ArtPalette | null    = null

  function flush (): void {
    cancelFrame = null

    const root = services.root
    if (!root)
      return

    const { settings } = stores.settings.getState()

    root.setAttribute('data-theme', resolveTheme(settings.theme))
    root.style.fontSize = `${BASE_FONT_SIZE_PX * settings.fontScale}px`

    const custom = parseColor(settings.accentColor) ?? DEFAULT_ACCENT
    const source = settings.accentSource === 'artwork' && palette
      ? parseColor(palette.vibrant) ?? custom
      : custom

    const accent     = contrastLift(source, backgroundFor(root))
    const accentLuma = relativeLuminance(accent)

    root.style.setProperty('--accent', toCss(accent))
    root.style.setProperty('--accent-contrast', toCss(accentLuma > CONTRAST_MIDPOINT ? DARK_TEXT : LIGHT_TEXT))

    if (palette) {
      root.style.setProperty('--art-vibrant', palette.vibrant)
      root.style.setProperty('--art-muted', palette.muted)
      root.style.setProperty('--art-dark', palette.dark)
      root.style.setProperty('--art-light', palette.light)
      root.style.setProperty('--art-lum', String(palette.lum))
    }
  }

  function scheduleFlush (): void {
    if (cancelFrame || disposed)
      return
    cancelFrame = scheduleFrame(flush)
  }

  function loadPalette (trackId: string, artId: string): void {
    if (typeof Image === 'undefined') {
      scheduleFlush()
      return
    }

    const image       = new Image()
    image.crossOrigin = 'anonymous'
    image.onload      = () => {
      if (disposed || paletteTrackId !== trackId)
        return
      palette = paletteFromImage(image)
      scheduleFlush()
    }
    image.onerror = () => {
      if (disposed || paletteTrackId !== trackId)
        return
      palette = null
      scheduleFlush()
    }
    image.src = artUrl(artId)
  }

  const unsubscribeSettings = stores.settings.subscribe(scheduleFlush)

  const unsubscribePlayer = stores.player.subscribe(() => {
    const trackId = stores.player.getState().playback.trackId
    if (trackId === paletteTrackId)
      return

    paletteTrackId = trackId
    palette         = null

    if (!trackId) {
      scheduleFlush()
      return
    }

    const track = stores.library.getState().byId.get(trackId)
    if (track?.artId)
      loadPalette(trackId, track.artId)
    else
      scheduleFlush()
  })

  scheduleFlush()

  return () => {
    disposed = true
    cancelFrame?.()
    unsubscribeSettings()
    unsubscribePlayer()
  }
}

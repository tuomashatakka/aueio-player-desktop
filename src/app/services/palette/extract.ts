/**
 * Colour roles read off album art — port of `extractPalette` and its
 * constants from `desktop-audio/src/app/hooks/useAmbientPalette.ts`, split
 * into a pure function over pixel data ({@link extractPalette}, testable
 * with a synthetic fixture and no DOM) and a thin canvas-sampling wrapper
 * ({@link paletteFromImage}) for real images.
 *
 * The most saturated populous colour is `vibrant` (the accent candidate);
 * the darkest and lightest sampled colours bracket the wash; `lum` is the
 * image's mean luminance, for dimming the backdrop under a light sleeve.
 * `services/` writes nothing to the DOM — `effects/appearance.ts` is the
 * sole writer of `--accent` and the `--art-*` custom properties.
 */
import { toCss } from '../../domain/color'
import type { Rgb } from '../../domain/color'


/** Edge length of the sampling canvas. 32^2 pixels is plenty for a wash. */
export const SAMPLE_SIZE = 32

/** Bits dropped per channel when bucketing -- 4 bits leaves 16 levels each. */
const QUANT_SHIFT = 4

/** How many of the most-common buckets the roles are picked from. */
const POOL_SIZE = 16

/** Below this alpha a pixel is transparent enough to ignore. */
const MIN_ALPHA = 128

const ALPHA_OFFSET       = 3
const RED_BUCKET_SHIFT   = 16
const GREEN_BUCKET_SHIFT = 8

/** A colour is only "colourful" enough to lead the palette above this. */
const MIN_SATURATION = 0.15

/** ...and only if at least this many of the pool clear that bar. */
const MIN_COLOURFUL_COUNT = 3

/** Floor on the mid-luminance weighting when scoring `vibrant`. */
const LUMA_WEIGHT_FLOOR = 0.25

const CHANNEL_MAX = 255

/** Colour roles read off a piece of album art. */
export interface ArtPalette {

  /** Most saturated populous colour -- the one the sleeve reads as. */
  readonly vibrant: string

  /** A second, calmer stop for the wash. */
  readonly muted: string

  /** Darkest sampled colour. */
  readonly dark: string

  /** Lightest sampled colour. */
  readonly light: string

  /** Mean luminance of the whole image, 0-1. */
  readonly lum: number
}

/** The minimal pixel-buffer shape `extractPalette` needs -- `ImageData` satisfies this, so does a fixture. */
export interface ImageDataLike {
  readonly data:   ArrayLike<number>
  readonly width:  number
  readonly height: number
}

interface Bucket {
  count: number
  r:     number
  g:     number
  b:     number
}

interface Sample {
  readonly rgb:   Rgb
  readonly count: number
}

type BucketiseReturnType = { samples: Sample[], lum: number }

function luminance ([ r, g, b ]: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function saturation ([ r, g, b ]: Rgb): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max === 0 ? 0 : (max - min) / max
}

function vibrancy (sample: Sample): number {
  const l      = luminance(sample.rgb) / CHANNEL_MAX
  const midish = Math.max(LUMA_WEIGHT_FLOOR, 1 - Math.abs(l - 0.5) * 2)
  return saturation(sample.rgb) * Math.sqrt(sample.count) * midish
}

function bucketise (data: ArrayLike<number>): BucketiseReturnType {
  const buckets = new Map<number, Bucket>()

  let lumSum  = 0
  let counted = 0

  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + ALPHA_OFFSET] ?? 0) < MIN_ALPHA)
      continue

    const r   = data[i] ?? 0
    const g   = data[i + 1] ?? 0
    const b   = data[i + 2] ?? 0
    const key = r >> QUANT_SHIFT << RED_BUCKET_SHIFT |
      g >> QUANT_SHIFT << GREEN_BUCKET_SHIFT |
      b >> QUANT_SHIFT

    lumSum += luminance([ r, g, b ])
    counted++

    const bucket = buckets.get(key)
    if (bucket) {
      bucket.count++
      bucket.r += r
      bucket.g += g
      bucket.b += b
    }
    else
      buckets.set(key, { count: 1, r, g, b })
  }

  const samples: Sample[] = [ ...buckets.values() ]
    .sort((a, b) =>
      b.count - a.count)
    .map(({ count, r, g, b }) =>
      ({ rgb: [ r / count, g / count, b / count ] as Rgb, count }))

  return { samples, lum: counted === 0 ? 0 : lumSum / counted / CHANNEL_MAX }
}

function toRoles (samples: Sample[], lum: number): ArtPalette | null {
  if (samples.length === 0)
    return null

  const colourful = samples.filter(s =>
    saturation(s.rgb) > MIN_SATURATION)
  const pool = (colourful.length >= MIN_COLOURFUL_COUNT ? colourful : samples).slice(0, POOL_SIZE)

  const byLuma = [ ...pool ].sort((a, b) =>
    luminance(a.rgb) - luminance(b.rgb))
  const byVibrancy = [ ...pool ].sort((a, b) =>
    vibrancy(b) - vibrancy(a))

  const vibrant = byVibrancy[0]!.rgb
  const dark    = byLuma[0]!.rgb
  const light   = byLuma[byLuma.length - 1]!.rgb
  const muted   = (byVibrancy[1] ?? byLuma[Math.floor(byLuma.length / 2)])!.rgb

  return {
    vibrant: toCss(vibrant),
    muted:   toCss(muted),
    dark:    toCss(dark),
    light:   toCss(light),
    lum,
  }
}

/**
 * Colour roles for already-decoded pixel data, or `null` if there is nothing
 * to read (every pixel transparent). Pure -- no `Image`, no canvas, no DOM --
 * so it is the part of this module a test drives directly.
 */
export function extractPalette (image: ImageDataLike): ArtPalette | null {
  const { samples, lum } = bucketise(image.data)
  return toRoles(samples, lum)
}

/**
 * Draws `source` onto a {@link SAMPLE_SIZE}x{@link SAMPLE_SIZE} canvas and
 * reads {@link extractPalette} off the result. The only DOM-touching part of
 * this module; everything it does not already know how to do (decoding,
 * cross-origin) is the caller's problem.
 */
export function paletteFromImage (source: CanvasImageSource): ArtPalette | null {
  const canvas  = document.createElement('canvas')
  canvas.width  = SAMPLE_SIZE
  canvas.height = SAMPLE_SIZE

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx)
    return null

  ctx.drawImage(source, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)

  try {
    return extractPalette(ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE))
  }
  catch {
    // A tainted canvas (cross-origin source without CORS) throws on read.
    return null
  }
}

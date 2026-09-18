import type { DspJSON, SettingsJSON } from './dto'
import { EQ_BAND_COUNT } from './constants'


const THEMES: readonly SettingsJSON['theme'][]                = [ 'dark', 'light', 'auto' ]
const ACCENT_SOURCES: readonly SettingsJSON['accentSource'][] = [ 'artwork', 'custom' ]
const REPEAT_MODES: readonly SettingsJSON['repeat'][]         = [ 'none', 'one', 'all' ]

export const DEFAULT_SETTINGS: SettingsJSON = {
  roots:        [],
  theme:        'dark',
  accentSource: 'artwork',
  accentColor:  '#00e5d1',
  fontScale:    1,
  volume:       0.8,
  shuffle:      false,
  repeat:       'none',
  dsp:          {
    eq: {
      on:    false,
      gains: Array.from({ length: EQ_BAND_COUNT }, () =>
        0),
    },
    limiter: {
      on:        false,
      threshold: -1,
      release:   100,
    },
  },
  showChords:   true,
  showKey:      true,
  expandedSize: { width: 1200, height: 800 },
}

function choice<T extends string> (value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? value as T
    : fallback
}

function clamp (value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback
}

function normalizeGains (value: unknown): number[] {
  if (!Array.isArray(value) || value.length !== EQ_BAND_COUNT)
    return DEFAULT_SETTINGS.dsp.eq.gains.slice()
  return value.map(gain =>
    Number.isFinite(Number(gain)) ? Number(gain) : 0)
}

function normalizeDsp (value: unknown): DspJSON {
  const dsp     = (typeof value === 'object' && value !== null ? value : {}) as Partial<DspJSON>
  const eq      = (typeof dsp.eq === 'object' && dsp.eq !== null ? dsp.eq : {}) as Partial<DspJSON['eq']>
  const limiter = (typeof dsp.limiter === 'object' && dsp.limiter !== null ? dsp.limiter : {}) as Partial<DspJSON['limiter']>

  return {
    eq: {
      on:    Boolean(eq.on),
      gains: normalizeGains(eq.gains),
    },
    limiter: {
      on:        Boolean(limiter.on),
      threshold: clamp(limiter.threshold, -24, 0, DEFAULT_SETTINGS.dsp.limiter.threshold),
      release:   clamp(limiter.release, 1, 1000, DEFAULT_SETTINGS.dsp.limiter.release),
    },
  }
}

function normalizeExpandedSize (value: unknown): SettingsJSON['expandedSize'] {
  const size = (typeof value === 'object' && value !== null ? value : {}) as Partial<SettingsJSON['expandedSize']>
  return {
    width:  clamp(size.width, 480, 4000, DEFAULT_SETTINGS.expandedSize.width),
    height: clamp(size.height, 320, 4000, DEFAULT_SETTINGS.expandedSize.height),
  }
}

function normalizeRoots (value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((root): root is string =>
      typeof root === 'string')
    : []
}

/** Pure normaliser: any JSON value in, a fully-shaped `SettingsJSON` out. */
export function normalizeSettings (input: unknown): SettingsJSON {
  const raw = (typeof input === 'object' && input !== null ? input : {}) as Partial<SettingsJSON>

  return {
    roots:        normalizeRoots(raw.roots),
    theme:        choice(raw.theme, THEMES, DEFAULT_SETTINGS.theme),
    accentSource: choice(raw.accentSource, ACCENT_SOURCES, DEFAULT_SETTINGS.accentSource),
    accentColor:  typeof raw.accentColor === 'string' && raw.accentColor.length > 0
      ? raw.accentColor
      : DEFAULT_SETTINGS.accentColor,
    fontScale:    clamp(raw.fontScale, 0.8, 1.4, DEFAULT_SETTINGS.fontScale),
    volume:       clamp(raw.volume, 0, 1, DEFAULT_SETTINGS.volume),
    shuffle:      Boolean(raw.shuffle),
    repeat:       choice(raw.repeat, REPEAT_MODES, DEFAULT_SETTINGS.repeat),
    dsp:          normalizeDsp(raw.dsp),
    showChords:   raw.showChords === undefined ? DEFAULT_SETTINGS.showChords : Boolean(raw.showChords),
    showKey:      raw.showKey === undefined ? DEFAULT_SETTINGS.showKey : Boolean(raw.showKey),
    expandedSize: normalizeExpandedSize(raw.expandedSize),
  }
}

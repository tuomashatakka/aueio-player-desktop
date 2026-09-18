/**
 * User preferences, normalized against garbage on the way in. Wraps the pure
 * normaliser in `src/shared/settings.ts` — that file has no DTO-class
 * dependents, so main can read/write `settings.json` through it without
 * importing `src/app`.
 */
import type { DspJSON, SettingsJSON } from '../../shared/dto'
import { DEFAULT_SETTINGS, normalizeSettings } from '../../shared/settings'


export class Settings {
  private constructor (
    readonly roots:        readonly string[],
    readonly theme:        SettingsJSON['theme'],
    readonly accentSource: SettingsJSON['accentSource'],
    readonly accentColor:  string,
    readonly fontScale:    number,
    readonly volume:       number,
    readonly shuffle:      boolean,
    readonly repeat:       SettingsJSON['repeat'],
    readonly dsp:          DspJSON,
    readonly showChords:   boolean,
    readonly showKey:      boolean,
    readonly expandedSize: SettingsJSON['expandedSize'],
  ) {
    Object.freeze(this)
  }

  static defaults (): Settings {
    return Settings.fromJSON(DEFAULT_SETTINGS)
  }

  /** Accepts any JSON value — garbage in yields the defaulted shape out. */
  static fromJSON (json: unknown): Settings {
    const n = normalizeSettings(json)
    return new Settings(
      n.roots, n.theme, n.accentSource, n.accentColor, n.fontScale, n.volume,
      n.shuffle, n.repeat, n.dsp, n.showChords, n.showKey, n.expandedSize,
    )
  }

  toJSON (): SettingsJSON {
    return {
      roots:        this.roots as string[],
      theme:        this.theme,
      accentSource: this.accentSource,
      accentColor:  this.accentColor,
      fontScale:    this.fontScale,
      volume:       this.volume,
      shuffle:      this.shuffle,
      repeat:       this.repeat,
      dsp:          this.dsp,
      showChords:   this.showChords,
      showKey:      this.showKey,
      expandedSize: this.expandedSize,
    }
  }

  with (patch: Partial<SettingsJSON>): Settings {
    return Settings.fromJSON({ ...this.toJSON(), ...patch })
  }
}

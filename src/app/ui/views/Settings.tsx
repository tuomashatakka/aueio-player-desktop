/**
 * The Settings screen: one `<form>` of `<fieldset>`s (Library roots,
 * Appearance, Playback, Analysis, Hotkeys, About). Named `SettingsView` to
 * avoid colliding with `domain`'s `Settings` class, which this file also
 * reads from the store. See AGENTS.md L8.
 */
import type { ChangeEvent, ReactElement } from 'react'
import type { SettingsJSON } from '../../../shared/dto'
import { useStore, useStores } from '../hooks/useStore'
import { DEFAULT_HOTKEYS } from './hotkeys'


const FONT_SCALE_MIN  = 0.8
const FONT_SCALE_MAX  = 1.4
const FONT_SCALE_STEP = 0.05

export function SettingsView (): ReactElement {
  const stores   = useStores()
  const settings = useStore(stores.settings, state =>
    state.settings)

  function patch (value: Partial<SettingsJSON>): void {
    stores.settings.dispatch({ type: 'settings/changed', patch: value })
  }

  function addRoot (): void {
    stores.ui.dispatch({ type: 'ui/rootPickRequested' })
  }

  function removeRoot (root: string): void {
    patch({ roots: settings.roots.filter(existing =>
      existing !== root) })
  }

  function onThemeChange (event: ChangeEvent<HTMLInputElement>): void {
    patch({ theme: event.target.value as SettingsJSON['theme'] })
  }

  function onAccentSourceChange (event: ChangeEvent<HTMLInputElement>): void {
    patch({ accentSource: event.target.value as SettingsJSON['accentSource'] })
  }

  function onAccentColorChange (event: ChangeEvent<HTMLInputElement>): void {
    patch({ accentColor: event.target.value })
  }

  function onFontScaleChange (event: ChangeEvent<HTMLInputElement>): void {
    patch({ fontScale: Number(event.target.value) })
  }

  function onShuffleChange (event: ChangeEvent<HTMLInputElement>): void {
    patch({ shuffle: event.target.checked })
  }

  function onRepeatChange (event: ChangeEvent<HTMLInputElement>): void {
    patch({ repeat: event.target.value as SettingsJSON['repeat'] })
  }

  function onShowChordsChange (event: ChangeEvent<HTMLInputElement>): void {
    patch({ showChords: event.target.checked })
  }

  function onShowKeyChange (event: ChangeEvent<HTMLInputElement>): void {
    patch({ showKey: event.target.checked })
  }

  return <form>
    <fieldset>
      <legend>Library</legend>

      <ul>
        {settings.roots.map(root =>
          <RootRow key={ root } root={ root } onRemove={ removeRoot } />)}
      </ul>

      <button type="button" className="button" onClick={ addRoot }>Add root…</button>
    </fieldset>

    <fieldset>
      <legend>Appearance</legend>

      <label>
        <input type="radio" name="theme" value="auto" checked={ settings.theme === 'auto' } onChange={ onThemeChange } />
        Auto
      </label>

      <label>
        <input type="radio" name="theme" value="dark" checked={ settings.theme === 'dark' } onChange={ onThemeChange } />
        Dark
      </label>

      <label>
        <input type="radio" name="theme" value="light" checked={ settings.theme === 'light' } onChange={ onThemeChange } />
        Light
      </label>

      <label>
        <input type="radio" name="accent-source" value="artwork" checked={ settings.accentSource === 'artwork' } onChange={ onAccentSourceChange } />
        From artwork
      </label>

      <label>
        <input type="radio" name="accent-source" value="custom" checked={ settings.accentSource === 'custom' } onChange={ onAccentSourceChange } />
        Custom
        <input type="color" value={ settings.accentColor } onChange={ onAccentColorChange } />
      </label>

      <label>
        Font size
        <input type="range" min={ FONT_SCALE_MIN } max={ FONT_SCALE_MAX } step={ FONT_SCALE_STEP } value={ settings.fontScale } onChange={ onFontScaleChange } />
      </label>
    </fieldset>

    <fieldset>
      <legend>Playback</legend>

      <label>
        <input type="checkbox" checked={ settings.shuffle } onChange={ onShuffleChange } />
        Shuffle
      </label>

      <label>
        <input type="radio" name="repeat" value="none" checked={ settings.repeat === 'none' } onChange={ onRepeatChange } />
        No repeat
      </label>

      <label>
        <input type="radio" name="repeat" value="all" checked={ settings.repeat === 'all' } onChange={ onRepeatChange } />
        Repeat all
      </label>

      <label>
        <input type="radio" name="repeat" value="one" checked={ settings.repeat === 'one' } onChange={ onRepeatChange } />
        Repeat one
      </label>
    </fieldset>

    <fieldset>
      <legend>Analysis</legend>

      <label>
        <input type="checkbox" checked={ settings.showChords } onChange={ onShowChordsChange } />
        Show chords
      </label>

      <label>
        <input type="checkbox" checked={ settings.showKey } onChange={ onShowKeyChange } />
        Show key
      </label>
    </fieldset>

    <fieldset>
      <legend>Hotkeys</legend>

      <table>
        <thead>
          <tr>
            <th scope="col">Action</th>
            <th scope="col">Shortcut</th>
          </tr>
        </thead>

        <tbody>
          {DEFAULT_HOTKEYS.map(hotkey =>
            <tr key={ hotkey.id }>
              <td>{hotkey.label}</td>

              <td>
                <kbd>{hotkey.shortcut}</kbd>
              </td>
            </tr>)}
        </tbody>
      </table>
    </fieldset>

    <fieldset>
      <legend>About</legend>
      <p>aüeio player</p>
    </fieldset>
  </form>
}

interface RootRowProps {
  readonly root:     string
  readonly onRemove: (root: string) => void
}

function RootRow ({ root, onRemove }: RootRowProps): ReactElement {
  function onClick (): void {
    onRemove(root)
  }

  return <li>
    {root}
    <button type="button" className="button ghost" onClick={ onClick }>Remove</button>
  </li>
}

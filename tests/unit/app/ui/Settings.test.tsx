import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createStores } from '../../../../src/app/state'
import { StoresContext } from '../../../../src/app/ui/hooks/useStore'
import { SettingsView } from '../../../../src/app/ui/views/Settings'


function renderSettings (stores: ReturnType<typeof createStores>): string {
  return renderToStaticMarkup(
    <StoresContext.Provider value={ stores }>
      <SettingsView />
    </StoresContext.Provider>,
  )
}

/** The whole `<input .../>` tag for the theme radio at `value` — attribute order can vary. */
function themeRadioTag (html: string, value: string): string {
  const match = html.match(new RegExp(`<input[^>]*name="theme"[^>]*value="${value}"[^>]*/>|<input[^>]*value="${value}"[^>]*name="theme"[^>]*/>`))
  return match?.[0] ?? ''
}

describe('SettingsView', () => {
  test('reflects the default theme (dark) as the checked radio', () => {
    const stores = createStores()
    const html   = renderSettings(stores)

    expect(themeRadioTag(html, 'dark')).toContain('checked=""')
    expect(themeRadioTag(html, 'light')).not.toContain('checked=""')
  })

  test('reflects a changed theme after settings/changed', () => {
    const stores = createStores()
    stores.settings.dispatch({ type: 'settings/changed', patch: { theme: 'light' }})

    const html = renderSettings(stores)

    expect(themeRadioTag(html, 'light')).toContain('checked=""')
    expect(themeRadioTag(html, 'dark')).not.toContain('checked=""')
  })

  test('lists every configured root', () => {
    const stores = createStores()
    stores.settings.dispatch({ type: 'settings/changed', patch: { roots: [ '/music/one', '/music/two' ]}})

    const html = renderSettings(stores)

    expect(html).toContain('/music/one')
    expect(html).toContain('/music/two')
  })

  test('lists the 12 default hotkeys', () => {
    const stores = createStores()
    const html   = renderSettings(stores)

    expect((html.match(/<kbd>/g) ?? []).length).toBe(12)
  })
})

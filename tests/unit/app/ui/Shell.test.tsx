import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createStores } from '../../../../src/app/state'
import { App } from '../../../../src/app/ui/App'


describe('Shell', () => {
  test('renders the landmark regions from index.html', () => {
    const stores = createStores()
    const html   = renderToStaticMarkup(
      <App stores={ stores } />
    )

    expect(html).toContain('class="shell"')
    expect(html).toContain('class="titlebar')
    expect(html).toContain('id="sidebar"')
    expect(html).toContain('data-view="library"')
    expect(html).toContain('class="player"')
  })

  test('every overlay sibling from index.html is present', () => {
    const stores = createStores()
    const html   = renderToStaticMarkup(
      <App stores={ stores } />
    )

    expect(html).toContain('data-expanded')
    expect(html).toContain('class="tag-editor"')
    expect(html).toContain('class="dsp"')
    expect(html).toContain('class="context"')
  })

  test('switches the main view when ui/viewChanged fires', () => {
    const stores = createStores()
    stores.ui.dispatch({ type: 'ui/viewChanged', view: 'settings' })

    const html = renderToStaticMarkup(
      <App stores={ stores } />
    )
    expect(html).toContain('data-view="settings"')
  })
})

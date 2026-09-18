import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createStores } from '../../../../src/app/state'
import { StoresContext } from '../../../../src/app/ui/hooks/useStore'
import { TagEditor } from '../../../../src/app/ui/views/TagEditor'
import { trackJson } from './helpers'


function renderTagEditor (stores: ReturnType<typeof createStores>): string {
  return renderToStaticMarkup(
    <StoresContext.Provider value={ stores }>
      <TagEditor />
    </StoresContext.Provider>,
  )
}

describe('TagEditor', () => {
  test('lists the primary fields and the extended Album field', () => {
    const stores = createStores()
    stores.library.dispatch({ type: 'library/batchReceived', tracks: [ trackJson({ id: 't1', title: 'One More Time', artist: 'Daft Punk', album: 'Discovery' }) ]})
    stores.ui.dispatch({ type: 'ui/tagEditorOpened', id: 't1' })

    const html = renderTagEditor(stores)

    expect(html).toContain('name="title"')
    expect(html).toContain('value="One More Time"')
    expect(html).toContain('name="artist"')
    expect(html).toContain('value="Daft Punk"')
    expect(html).toContain('name="album"')
    expect(html).toContain('value="Discovery"')
    expect(html).toContain('<summary>More</summary>')
  })

  test('renders empty fields when no track is being edited', () => {
    const stores = createStores()
    const html   = renderTagEditor(stores)

    expect(html).toContain('name="title"')
    expect(html).not.toContain('value="One More Time"')
  })

  test('has Save and Cancel controls', () => {
    const stores = createStores()
    const html   = renderTagEditor(stores)

    expect(html).toContain('>Save<')
    expect(html).toContain('>Cancel<')
  })
})

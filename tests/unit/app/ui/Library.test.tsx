import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createStores } from '../../../../src/app/state'
import { Library } from '../../../../src/app/ui/views/Library'
import { StoresContext } from '../../../../src/app/ui/hooks/useStore'
import { trackJson } from './helpers'


function renderLibrary (stores: ReturnType<typeof createStores>): string {
  return renderToStaticMarkup(
    <StoresContext.Provider value={ stores }>
      <Library />
    </StoresContext.Provider>,
  )
}

describe('Library', () => {
  test('renders one row per track, flat and unsorted-scope by default', () => {
    const stores = createStores()
    stores.library.dispatch({
      type:   'library/batchReceived',
      tracks: [
        trackJson({ id: 't1', title: 'One More Time' }),
        trackJson({ id: 't2', title: '15 Step' }),
        trackJson({ id: 't3', title: 'King Kunta' }),
      ],
    })

    const html = renderLibrary(stores)

    expect(html).toContain('data-track-id="t1"')
    expect(html).toContain('data-track-id="t2"')
    expect(html).toContain('data-track-id="t3"')
    expect((html.match(/data-track-id="/g) ?? []).length).toBe(3)
  })

  test('honours data-selected from ui.selection', () => {
    const stores = createStores()
    stores.library.dispatch({
      type:   'library/batchReceived',
      tracks: [
        trackJson({ id: 't1', title: 'One More Time' }),
        trackJson({ id: 't2', title: '15 Step' }),
      ],
    })
    stores.ui.dispatch({ type: 'ui/rowClicked', id: 't1', orderedIds: [ 't1', 't2' ], toggle: false, range: false })

    const html = renderLibrary(stores)

    expect(html).toContain('data-track-id="t1" data-selected="true"')
    expect(html).toContain('data-track-id="t2" data-selected="false"')
  })

  test('search narrows the row count', () => {
    const stores = createStores()
    stores.library.dispatch({
      type:   'library/batchReceived',
      tracks: [
        trackJson({ id: 't1', title: 'One More Time' }),
        trackJson({ id: 't2', title: '15 Step' }),
      ],
    })
    stores.library.dispatch({ type: 'library/searchChanged', search: 'one more' })

    const html = renderLibrary(stores)

    expect(html).toContain('data-track-id="t1"')
    expect(html).not.toContain('data-track-id="t2"')
  })
})

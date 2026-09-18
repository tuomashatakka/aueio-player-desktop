import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createStores } from '../../../../src/app/state'
import { Player } from '../../../../src/app/ui/components/Player'
import { StoresContext } from '../../../../src/app/ui/hooks/useStore'
import { trackJson } from './helpers'


/**
 * `data-live` (`FrequencyMatrix`) is the one attribute `expanded` is allowed
 * to select, per the "One DOM" invariant — everything else must render
 * identically regardless of which copy it is. Stripped before the
 * byte-for-byte comparison below so that comparison tests the invariant
 * itself, not the one value it deliberately carries.
 */
function stripLiveAttribute (html: string): string {
  return html.replace(/ data-live(="")?/g, '')
}

describe('Player — One DOM invariant', () => {
  test('the footer copy and the overlay copy render byte-identical markup, `data-live` aside', () => {
    const stores = createStores()
    stores.library.dispatch({ type: 'library/batchReceived', tracks: [ trackJson({ id: 't1', title: 'One More Time' }) ]})
    stores.player.dispatch({ type: 'player/playRequested', ids: [ 't1' ], startIndex: 0 })

    const footer = renderToStaticMarkup(
      <StoresContext.Provider value={ stores }>
        <Player expanded={ false } />
      </StoresContext.Provider>,
    )
    const overlay = renderToStaticMarkup(
      <StoresContext.Provider value={ stores }>
        <Player expanded />
      </StoresContext.Provider>,
    )

    expect(stripLiveAttribute(footer)).toBe(stripLiveAttribute(overlay))
  })

  test('nothing is conditionally unmounted: transport, waveform and lyrics are always present', () => {
    const stores = createStores()
    const html   = renderToStaticMarkup(
      <StoresContext.Provider value={ stores }>
        <Player expanded={ false } />
      </StoresContext.Provider>,
    )

    expect(html).toContain('class="transport"')
    expect(html).toContain('class="waveform"')
    expect(html).toContain('class="lyrics"')
    expect(html).toContain('class="chord-lane"')
    expect(html).toContain('class="readout"')
  })

  test('data-mode and data-lyrics mirror the ui store', () => {
    const stores = createStores()
    stores.ui.dispatch({ type: 'ui/playerModeSet', mode: 'analysis' })
    stores.ui.dispatch({ type: 'ui/lyricsToggled' })

    const html = renderToStaticMarkup(
      <StoresContext.Provider value={ stores }>
        <Player expanded={ false } />
      </StoresContext.Provider>,
    )

    expect(html).toContain('data-mode="analysis"')
    expect(html).toContain('data-lyrics="true"')
  })

  test('data-empty is set with no current track, and cleared once one is playing', () => {
    const stores = createStores()
    const empty  = renderToStaticMarkup(
      <StoresContext.Provider value={ stores }>
        <Player expanded={ false } />
      </StoresContext.Provider>,
    )
    expect(empty).toContain('data-empty')

    stores.library.dispatch({ type: 'library/batchReceived', tracks: [ trackJson({ id: 't1', title: 'One More Time' }) ]})
    stores.player.dispatch({ type: 'player/playRequested', ids: [ 't1' ], startIndex: 0 })

    const playing = renderToStaticMarkup(
      <StoresContext.Provider value={ stores }>
        <Player expanded={ false } />
      </StoresContext.Provider>,
    )
    expect(playing).not.toContain('data-empty')
  })
})

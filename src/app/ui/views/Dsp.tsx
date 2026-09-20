/** The DSP overlay: ten EQ faders with their response curve, and the limiter. */
import type { ChangeEvent, ReactElement } from 'react'
import type { DspJSON } from '../../../shared/dto'
import { DspFader } from '../components/DspFader'
import { EQ_BANDS } from '../components/eqMath'
import { EqCurve } from '../components/EqCurve'
import { Icon } from '../components/Icon'
import { useStore, useStores } from '../hooks/useStore'


const THRESHOLD_MIN = -24
const THRESHOLD_MAX = 0
const RELEASE_MIN   = 1
const RELEASE_MAX   = 1000

export function Dsp (): ReactElement {
  const stores = useStores()
  const dsp    = useStore(stores.player, state =>
    state.dsp)

  function onClose (): void {
    stores.ui.dispatch({ type: 'ui/overlayClosed' })
  }

  function setGain (index: number, value: number): void {
    const gains  = dsp.eq.gains.slice()
    gains[index] = value
    stores.player.dispatch({ type: 'player/dspChanged', dsp: { ...dsp, eq: { ...dsp.eq, gains }}})
  }

  function toggleLimiter (): void {
    stores.player.dispatch({ type: 'player/dspChanged', dsp: { ...dsp, limiter: { ...dsp.limiter, on: !dsp.limiter.on }}})
  }

  function onThresholdChange (event: ChangeEvent<HTMLInputElement>): void {
    const next: DspJSON = { ...dsp, limiter: { ...dsp.limiter, threshold: Number(event.target.value) }}
    stores.player.dispatch({ type: 'player/dspChanged', dsp: next })
  }

  function onReleaseChange (event: ChangeEvent<HTMLInputElement>): void {
    const next: DspJSON = { ...dsp, limiter: { ...dsp.limiter, release: Number(event.target.value) }}
    stores.player.dispatch({ type: 'player/dspChanged', dsp: next })
  }

  return <>
    <button className="button icon" aria-label="Close DSP" type="button" onClick={ onClose }>
      <Icon name="close" />
    </button>

    <section className="dsp-body">
      <EqCurve gains={ dsp.eq.gains } />

      <div className="eq-faders">
        {EQ_BANDS.map((band, index) =>
          <DspFader key={ band.label } index={ index } label={ band.label } gain={ dsp.eq.gains[index] ?? 0 } onChange={ setGain } />)}
      </div>

      <fieldset>
        <legend>Limiter</legend>

        <label>
          <input type="checkbox" checked={ dsp.limiter.on } onChange={ toggleLimiter } />
          On
        </label>

        <label>
          Threshold
          <input type="range" min={ THRESHOLD_MIN } max={ THRESHOLD_MAX } value={ dsp.limiter.threshold } onChange={ onThresholdChange } />
        </label>

        <label>
          Release
          <input type="range" min={ RELEASE_MIN } max={ RELEASE_MAX } value={ dsp.limiter.release } onChange={ onReleaseChange } />
        </label>
      </fieldset>
    </section>
  </>
}

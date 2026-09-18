/** One `.eq-fader`: a band label, a vertical gain range and its `dB` readout. */
import type { ChangeEvent, ReactElement } from 'react'


const GAIN_MIN = -12
const GAIN_MAX = 12

function formatDb (value: number): string {
  const rounded = Math.round(value)
  return rounded < 0 ? `−${Math.abs(rounded)} dB` : `${rounded} dB`
}

interface DspFaderProps {
  readonly index:    number
  readonly label:    string
  readonly gain:     number
  readonly onChange: (index: number, value: number) => void
}

export function DspFader ({ index, label, gain, onChange }: DspFaderProps): ReactElement {
  function onInput (event: ChangeEvent<HTMLInputElement>): void {
    onChange(index, Number(event.target.value))
  }

  return <div className="eq-fader">
    <span>{label}</span>
    <input type="range" min={ GAIN_MIN } max={ GAIN_MAX } value={ gain } onChange={ onInput } />
    <span className="eq-value">{formatDb(gain)}</span>
  </div>
}

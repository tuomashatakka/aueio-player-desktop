/**
 * <aueio-playing-bars>
 * Animated equalizer bars shown next to the currently-playing track.
 * Set `paused` attribute to freeze the animation.
 */
export class AueioPlayingBars extends HTMLElement {
  static observedAttributes = ['paused']

  connectedCallback (): void {
    this.#render()
  }

  attributeChangedCallback (): void {
    this.#render()
  }

  #render (): void {
    const paused = this.hasAttribute('paused')
    this.innerHTML = `
      <span class="playing-bars${paused ? ' paused' : ''}">
        <span class="playing-bar"></span>
        <span class="playing-bar"></span>
        <span class="playing-bar"></span>
      </span>
    `
  }
}

customElements.define('aueio-playing-bars', AueioPlayingBars)

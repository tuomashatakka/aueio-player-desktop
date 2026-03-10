/**
 * <aueio-star-rating>
 * Inline 5-star rating widget.
 * Dispatches `aueio-rating-change` CustomEvent with detail.rating on click.
 */
export class AueioStarRating extends HTMLElement {
  static observedAttributes = ['value', 'readonly']

  #value = 0

  get value (): number { return this.#value }
  set value (v: number) {
    this.#value = v
    if (this.isConnected) this.#render()
  }

  connectedCallback (): void {
    this.#value = Number(this.getAttribute('value') ?? 0)
    this.#render()
  }

  attributeChangedCallback (name: string, _old: string, val: string): void {
    if (name === 'value') {
      this.#value = Number(val ?? 0)
      if (this.isConnected) this.#render()
    }
  }

  #render (): void {
    const ro = this.hasAttribute('readonly')
    this.setAttribute('role', ro ? 'img' : 'group')
    this.setAttribute('aria-label', `Rating: ${this.#value} of 5`)
    this.innerHTML = ''

    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('button')
      star.type = 'button'
      star.className = `star${i <= this.#value ? ' filled' : ''}`
      star.textContent = i <= this.#value ? '★' : '☆'
      star.setAttribute('aria-label', `Rate ${i}`)
      if (ro) {
        star.disabled = true
      } else {
        star.addEventListener('click', (e) => {
          e.stopPropagation()
          const newRating = i === this.#value ? 0 : i
          this.value = newRating
          this.dispatchEvent(new CustomEvent('aueio-rating-change', {
            bubbles: true,
            detail: { rating: newRating },
          }))
        })
      }
      this.append(star)
    }
  }
}

customElements.define('aueio-star-rating', AueioStarRating)

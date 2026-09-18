/**
 * A minimal radix-2 Cooley-Tukey FFT and the Hann window that `chroma.ts` and
 * `tempo.ts` both need. No dependency — §9 rules out `essentia.js`, `meyda`
 * and `aubiojs`, and this is the ~30 lines those would otherwise pull in a
 * dependency for.
 */

const windowCache = new Map<number, Float64Array>()

/**
 * In-place FFT. `re`/`im` must have equal, power-of-two length; `im` is the
 * caller's zeroed imaginary part on the way in and holds the transform's
 * imaginary part on the way out.
 */
export function fft (re: Float64Array, im: Float64Array): void {
  const n = re.length

  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; (j & bit) !== 0; bit >>= 1)
      j ^= bit
    j ^= bit

    if (i < j) {
      const tr = re[i]!
      re[i]    = re[j]!
      re[j]    = tr

      const ti = im[i]!
      im[i]    = im[j]!
      im[j]    = ti
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const half  = len >> 1
    const angle = -2 * Math.PI / len
    const wr    = Math.cos(angle)
    const wi    = Math.sin(angle)

    for (let i = 0; i < n; i += len) {
      let curWr = 1
      let curWi = 0

      for (let j = 0; j < half; j++) {
        const evenIndex = i + j
        const oddIndex  = evenIndex + half

        const evenR = re[evenIndex]!
        const evenI = im[evenIndex]!
        const oddR  = re[oddIndex]!
        const oddI  = im[oddIndex]!

        const vr = oddR * curWr - oddI * curWi
        const vi = oddR * curWi + oddI * curWr

        re[evenIndex] = evenR + vr
        im[evenIndex] = evenI + vi
        re[oddIndex]  = evenR - vr
        im[oddIndex]  = evenI - vi

        const nextWr = curWr * wr - curWi * wi
        const nextWi = curWr * wi + curWi * wr
        curWr = nextWr
        curWi = nextWi
      }
    }
  }
}

/** A Hann window of `size` samples, cached — every frame in a clip reuses the same one. */
export function hannWindow (size: number): Float64Array {
  const cached = windowCache.get(size)
  if (cached)
    return cached

  const window = new Float64Array(size)
  for (let i = 0; i < size; i++)
    window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / Math.max(1, size - 1)))

  windowCache.set(size, window)
  return window
}

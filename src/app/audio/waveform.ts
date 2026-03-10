const WAVEFORM_SAMPLES = 200


/**
 * Fetch an audio file and decode it to extract amplitude envelope data.
 * Returns a normalized Float32Array of WAVEFORM_SAMPLES values (0–1).
 */
export const loadWaveformData = async (
  url: string,
  ctx: AudioContext
): Promise<Float32Array> => {
  const resp = await fetch(url)
  const arrayBuf = await resp.arrayBuffer()
  const audioBuf = await ctx.decodeAudioData(arrayBuf)

  const channelData = audioBuf.getChannelData(0)
  const blockSize = Math.floor(channelData.length / WAVEFORM_SAMPLES)
  const waveform = new Float32Array(WAVEFORM_SAMPLES)

  for (let i = 0; i < WAVEFORM_SAMPLES; i++) {
    let sum = 0
    const start = i * blockSize

    for (let j = 0; j < blockSize; j++)
      sum += Math.abs(channelData[start + j] ?? 0)

    waveform[i] = sum / blockSize
  }

  // Normalize to [0, 1]
  const max = Math.max(...Array.from(waveform), 0.001)

  for (let i = 0; i < waveform.length; i++)
    waveform[i] = (waveform[i] ?? 0) / max

  return waveform
}

/**
 * Render waveform bars to a canvas element.
 * If showProgress=true, bars are colored by playback position.
 */
export const drawWaveformToCanvas = (
  canvas: HTMLCanvasElement,
  waveform: Float32Array,
  progress: number,
  showProgress: boolean
): void => {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  const w = rect.width || canvas.offsetWidth || 400
  const h = rect.height || canvas.offsetHeight || 80

  canvas.width = w * dpr
  canvas.height = h * dpr

  const ctx = canvas.getContext('2d')

  if (!ctx)
    return

  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, w, h)

  const progressX = progress * w
  const barW = w / waveform.length
  const gap = Math.max(1, barW * 0.15)
  const barActual = barW - gap

  for (let i = 0; i < waveform.length; i++) {
    const amp = waveform[i] ?? 0
    const barH = Math.max(2, amp * h * 0.85)
    const x = i * barW
    const y = (h - barH) / 2

    const isPast = showProgress && x + barActual < progressX
    const isCurrent = showProgress && x <= progressX && x + barActual >= progressX

    if (isPast)
      ctx.fillStyle = '#3a86ff'
    else if (isCurrent)
      ctx.fillStyle = '#ff5500'
    else
      ctx.fillStyle = showProgress ? 'rgba(255,255,255,0.15)' : 'rgba(58,134,255,0.4)'

    ctx.beginPath()
    ctx.roundRect(x, y, Math.max(1, barActual), barH, 1.5)
    ctx.fill()
  }
}

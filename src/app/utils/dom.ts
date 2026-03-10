export const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T

export const formatTime = (secs: number): string => {
  if (!Number.isFinite(secs) || secs < 0)
    return '0:00'

  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const escapeHtml = (str: string): string =>
  str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

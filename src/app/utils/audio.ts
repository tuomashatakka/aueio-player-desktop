import type { Track } from '../state/types'


export const buildAudioUrl = (path: string, port: number): string =>
  `http://localhost:${port}/audio?p=${encodeURIComponent(path)}`

export const getTrackEmoji = (track: Track): string => {
  const ext = track.path.split('.').pop()
    ?.toLowerCase() ?? ''
  const emojiMap: Record<string, string> = {
    mp3:  '\u{1F3B5}',
    flac: '\u{1F3BC}',
    wav:  '\u{1F50A}',
    m4a:  '\u{1F3B6}',
    ogg:  '\u{1F3B5}',
    aac:  '\u{1F3B5}',
    opus: '\u{1F3B5}',
    wma:  '\u{1F3B5}',
  }
  return emojiMap[ext] ?? '\u{1F3B5}'
}

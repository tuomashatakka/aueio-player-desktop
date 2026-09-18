export const AUDIO_EXTENSIONS = [
  '.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac', '.opus', '.webm', '.wma', '.aiff', '.aif',
] as const

export const MIME_BY_EXTENSION: Record<string, string> = {
  '.mp3':  'audio/mpeg',
  '.m4a':  'audio/mp4',
  '.flac': 'audio/flac',
  '.wav':  'audio/wav',
  '.ogg':  'audio/ogg',
  '.aac':  'audio/aac',
  '.opus': 'audio/opus',
  '.webm': 'audio/webm',
  '.wma':  'audio/x-ms-wma',
  '.aiff': 'audio/aiff',
  '.aif':  'audio/aiff',
}

export const ANALYSIS_VERSION = 1

export const SCAN_BATCH_SIZE = 50

export const PAGE_SIZE = 200

export const EQ_BAND_COUNT = 10

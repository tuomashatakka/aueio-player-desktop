/** Shared test fixtures for `tests/unit/app/ui/**` — server-rendered (`renderToStaticMarkup`) checks against `createStores()`. */
import type { TrackJSON } from '../../../../src/shared/dto'


export function trackJson (overrides: Partial<TrackJSON> & Pick<TrackJSON, 'id' | 'title'>): TrackJSON {
  return {
    path:       overrides.id,
    artist:     'Test Artist',
    album:      'Test Album',
    duration:   180,
    format:     'flac',
    size:       1024,
    coverColor: '#1a1a1a',
    mtimeMs:    0,
    ...overrides,
  }
}

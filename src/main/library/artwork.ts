/**
 * Content-addressed artwork ids. Two tracks with the same embedded picture
 * (the common case — every track on an album) hash to the same id, so
 * `artwork` stores one row per picture rather than one per track.
 */

const ART_ID_LENGTH = 16

/** First 16 hex characters of the SHA-256 of `bytes`. */
export function artIdOf (bytes: Uint8Array): string {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(bytes)
  return hasher.digest('hex').slice(0, ART_ID_LENGTH)
}

/**
 * `Gateway.mediaUrl`/`artUrl` are async (the origin/token round-trip is
 * only worth taking once). `bootstrap.ts` resolves `gateway.mediaOrigin()`
 * once at startup and warms this module-level cache with it; every other
 * effect (`player.ts`, `analysis.ts`, `appearance.ts`, `mediaSession.ts`)
 * then builds media/art URLs synchronously off {@link buildMediaUrl}/
 * {@link buildArtUrl} — same singleton pattern as
 * `services/keybindings/index.ts`'s `keybindingStore`.
 */
import { buildArtUrl, buildMediaUrl } from '../services/gateway/Gateway'
import type { MediaOrigin } from '../services/gateway/Gateway'


let origin: MediaOrigin | null = null

/** Warms the cache. `bootstrap.ts` calls this once; tests call it directly to skip the round-trip. */
export function setMediaOrigin (value: MediaOrigin | null): void {
  origin = value
}

/** `''` before the origin has resolved — callers see it fill in moments after `startEffects`. */
export function mediaUrl (id: string): string {
  return origin ? buildMediaUrl(origin, id) : ''
}

export function artUrl (artId: string): string {
  return origin ? buildArtUrl(origin, artId) : ''
}

# aueio-player-desktop — Agent Guide

Electrobun 2 (Bun main process, system WebKit webview) + React 19 music
player. Bun only — never npm, yarn, or pnpm. Full spec and rationale:
`docs/plans/desktop-audio-migration.md`.

---

## Commands

```bash
bun install               # install deps
bun run dev                # hutch electrobun dev --watch
bun run check              # lint + typecheck + unit tests
bun run lint                # eslint . (also lints src/app/styles/*.css)
bun run typecheck           # tsc --noEmit
bun run test                # bun test tests/unit
bun run test:e2e            # build:web, then playwright
bun run screenshots         # build:web, then scripts/screenshots.ts
bun run build:stable        # hutch electrobun build --env=stable
```

`hutch electrobun sync` fetches the real Electrobun devkit (types, native
SDK) into `.hutch/devkit`; CI runs it before building. It could not run in
this container (WebSocket artifact fetch blocked by the sandbox egress
proxy), so `src/types/electrobun.d.ts` is a hand-written shim of just enough
of `electrobun`, `electrobun/main` and `electrobun/view` for `tsc` to pass.
Delete the shim once `hutch electrobun sync` can run locally and point
`tsconfig.json` at `.hutch/devkit/tsconfig.json` instead.

---

## Folder map

```
src/shared/     wire contract: rpc.ts, dto.ts (JSON interfaces), constants.ts,
                settings.ts (pure normaliser). Imports nothing.
src/main/       Bun process: db/ (bun:sqlite schema + repository),
                library/ (scanner worker, metadata, artwork), media/
                (range-serving HTTP server), rpc/ (handlers.ts), settings/
                (settings.json store), window.ts, index.ts
src/app/
  domain/       DTO classes (Track, Album, Artist, FolderNode, Playlist,
                Queue, PlaybackState, Settings, Analysis, …). Pure, immutable.
  state/        store.ts (createStore), memo.ts, and one
                {actions,reducer,selectors} module per slice: library,
                player, settings, ui
  services/     gateway/ (Gateway, RpcGateway, FakeGateway), audio/ (engine,
                dspChain, eqResponse), analysis/ (client + worker + chroma/
                key/chords/tempo/peaks/fft), palette/, keybindings/, menu/
  effects/      the only side-effect code: bootstrap, library, player,
                analysis, appearance, mediaSession, keyboard, persistence,
                contextMenu, frame, tapDispatch, media, services — each
                `(stores, services) => dispose`, registered once in index.tsx
  ui/           React components/hooks/layout/views — thin, reads via
                useStore(selector), writes via dispatch
  styles/       CSS entry + one file per @layer (below)
  workers/      (analysis worker lives under services/analysis/ instead —
                see electrobun.config.ts's `views.analysisWorker`)
tests/
  unit/         bun:test, mirrors src/ (app/domain, app/state, app/services,
                app/effects, app/ui, main/db, main/library, main/media,
                main/settings, shared, styles/contract.test.ts)
  e2e/          Playwright specs + helpers.ts (opens the app with
                ?gateway=fake)
  fixtures/     tiny CC0 audio files (wav/mp3) used by both scanner and e2e
                tests
scripts/        build-web.ts (bundles the app + analysis worker for a plain
                browser), serve-web.ts (Range-aware static server), 
                screenshots.ts
```

---

## Data flow (unidirectional, functional)

```
UI event → action ({type, ...payload}) → store.dispatch → reducer(state, action)
  → state′ (pure, sync) → subscribers: React (useSyncExternalStore) + effects
effects → services (RPC, audio, worker) → results dispatched as new actions
```

Seven rules, each with a lint zone in `eslint.config.mjs`'s
`import/no-restricted-paths` (or a test) enforcing it:

1. **One `createStore(reducer, initialState)`** (`state/store.ts`):
   `getState`, `dispatch`, `subscribe`. No middleware, no thunks.
2. **Four stores/reducers**: `library`, `player`, `settings`, `ui`. Selectors
   are plain `(state) => value`, memoised with `state/memo.ts`'s `memo1` for
   the expensive ones.
3. **DTOs are immutable classes** in `domain/`: `readonly` fields, `static
   fromJSON`, `toJSON`, `with(patch)`. Never a setter, never an import from
   `react`, `electrobun`, or the DOM.
   Lint zone: `src/app/domain` may import only `src/shared` and itself.
4. **`shared/` is the wire contract**: JSON-shaped interfaces plus the RPC
   schema. Both processes import it; it imports nothing.
   Lint zone: nothing may be imported *into* `src/shared` from `src/app` or
   `src/main`.
5. **React reads through `useStore(store, selector)`, writes through
   `dispatch`.** Components never call RPC, the audio engine, or workers.
   Lint zone: `src/app/ui` may not import `src/app/services` or
   `src/app/effects` directly.
6. **Effects are `(stores, services) => dispose`**, registered once in
   `app/index.tsx`. They are the only files allowed to import both `state/`
   and `services/`.
   Lint zone: `src/app/state` may not import `src/app/ui`, `services`, or
   `effects`.
7. **No `useEffect` in `ui/`** without a `react-strict/prefer-no-use-effect`
   justification comment (DOM measurement, canvas sampling, media-query
   listeners). Data subscriptions are effects, not React effects.

`src/app` and `src/main` never import each other directly either — they only
share `src/shared`.

---

## RPC contract

`src/shared/rpc.ts` defines `AppRPC`: `bun.requests` (main answers — settings
get/save, roots pick/forget, library page/scan/cancel, track.patchTags,
playlists list/save/delete, analysis get/put, media.origin, menu.context,
window.command, shell.open) and `webview.messages` (main pushes — scan.batch/
progress/done/error, menu.action, media.command). Payloads are JSON over
Electrobun's encrypted socket: **no binary and no artwork ever crosses RPC**;
media and art are served over a local `Bun.serve` HTTP origin
(`media.origin` hands back `{origin, token}`), fetched as
`${origin}/media/${id}?t=${token}` / `${origin}/art/${artId}?t=${token}`,
with real `Range`/206 support. `services/gateway/Gateway.ts` is the
interface; `RpcGateway` implements it over `electrobun/view`'s
`Electroview.defineRPC`, `FakeGateway` implements it over `tests/fixtures`
for tests and `?gateway=fake` e2e runs.

---

## Persistence

| Store | Where | Owner | Contents |
|---|---|---|---|
| `library.db` (SQLite, WAL) | `PATHS.userData` | `src/main/db` | `tracks`, `artwork(id, mime, bytes)`, `track_analysis(track_id, source_mtime_ms, version, json)` with a delete trigger, `playlists(id, json)` |
| `settings.json` | `PATHS.userData` | `src/main/settings` | `SettingsJSON`, normalized on read via `shared/settings.ts` |
| `localStorage` (webview) | — | `ui` store / `effects/persistence.ts` | UI ephemera: column config, density, grouping, sidebar width, `aueio-keybindings` |

---

## CSS architecture

Vite is not in use; CSS is copied verbatim (`electrobun.config.ts`'s
`build.copy`) and linted directly by `@eslint/css` through
`@tuomashatakka/eslint-config`. `src/app/styles/main.css` declares the layer
order and `@import`s each file once:

```css
@layer fonts, tokens, base, components, layout, views, states, utilities;
```

| File | Layer | What belongs in it |
|---|---|---|
| `fonts.css` | fonts | `@font-face` only |
| `tokens.css` | tokens | every custom property, `@property`, `:root`, `[data-theme]` — nowhere else |
| `base.css` | base | element selectors only (`body`, headings, `button`, `input`, `dialog`, `table`, `menu`, `kbd`, …), extending browser defaults |
| `components.css` | components | named things used in more than one view (`.button`, `.waveform`, `.cover`, `.eq-fader`, `.chord-lane`, `.frequency-matrix`, `.menu`) |
| `layout.css` | layout | structure only: the shell, titlebar, sidebar, and every `@container shell (...)` block |
| `views.css` | views | one root per screen: `main[data-view='library']`, `main[data-view='settings']`, `dialog.tag-editor`, `section.player`, `section.dsp` |
| `states.css` | states | cross-cutting attribute states: `[aria-busy]`, `[data-loading]`, `[aria-pressed]`, `[data-selected]`, focus ring, reduced motion |
| `utilities.css` | utilities | `.sr-only`, `.fade-y`, `.truncate` — nothing else |

**Invariant: One Token Contract.** All custom properties and every
theme-dependent selector (`:root`, `[data-theme]`) live in `tokens.css` and
nowhere else — enforced by `tests/unit/styles/contract.test.ts`.

**Invariant: One Writer for `--accent`.** `effects/appearance.ts` is the sole
writer of `--accent`, `--accent-contrast`, `--art-*`, `data-theme`, and root
`font-size` on `document.documentElement`, coalesced to one write per
animation frame (`effects/frame.ts`) however many inputs (settings, artwork
palette) changed at once. `services/palette/extract.ts` only *returns* a
palette; it never writes the DOM.

Conventions: native CSS nesting, never BEM; state via attributes the
component already sets (`[data-open]`, `[aria-pressed]`, `[data-mode]`)
rather than toggled classes; logical properties (`inline-size`,
`padding-block`), rem units, no `!important` — all lint-enforced. Two
container-query tiers replace JS height-tier state: `@container shell
(max-block-size: 18.75rem)` collapses the player to a strip, `@container
shell (max-inline-size: 40rem)` overlays the sidebar. `content-visibility:
auto` + `contain-intrinsic-block-size` on table rows (`base.css`) stands in
for a virtualiser; see `docs/css-architecture.md` for more.

To add a token: add it to `tokens.css` only. To add a component: add it to
`components.css` under its own root selector, in the `components` layer. To
add an action: add the type to the slice's `actions.ts`/reducer, dispatch it
from `ui/`, handle side effects (if any) in the matching `effects/*.ts`. To
add an effect: a new `(stores, services) => dispose` function, registered
once in `effects/index.ts`.

---

## Now Playing — one markup

`Player.tsx` renders **exactly one markup**, always, mounted twice (footer
bar inside the shell, and portaled into the expanded overlay). Nothing in it
is conditionally rendered; every state change is a `data-*` attribute
(`data-mode`, `data-lyrics`, `data-empty`) that CSS animates. `expanded` is a
prop but only ever selects **values** (which copy owns the `FrequencyMatrix`
rAF loop / `data-live`), never which elements exist. A test compares both
copies' `innerHTML` byte-for-byte (`tests/unit/app/ui`). Title, seek bar and
transport stay mounted and visible in every mode and every tier.

---

## WebKit codec caveat

The webview is system WebKit everywhere (`bundleCEF: false` on every
platform in `electrobun.config.ts`). MP3/AAC/ALAC/FLAC/WAV play and decode
reliably; **Ogg Vorbis/Opus playback and `decodeAudioData` support are not
guaranteed** on WebKit. A track that neither plays nor decodes is flagged
unplayable in the UI rather than spinning forever. `bundleCEF` remains a
config-only escape hatch for users who need Ogg.

---

## Testing conventions

- **`bun:test`** (`tests/unit`, `bun run test`): no DOM. DTO round-trips and
  immutability, table-driven reducer specs, selectors, `main/db` against an
  in-memory `bun:sqlite`, `main/media` range arithmetic, and
  `tests/unit/styles/contract.test.ts` — the CSS invariants (token contract,
  `main.css` layer order matches import order, no `!important`, no `px` font
  sizes, `views.css` top-level selectors start from an allowed root).
- **Playwright** (`tests/e2e`, `bun run test:e2e`): runs against
  `bun run build:web`'s static output, opened with `?gateway=fake` — the
  composition root swaps `RpcGateway` for `FakeGateway` seeded from
  `tests/fixtures`. `tests/e2e/helpers.ts`'s `openApp` is the shared
  bootstrap. Specs cover shell, library, player, settings, tag editor.
- **Screenshots** (`bun run screenshots`): drives the same `build/web` output
  via `scripts/screenshots.ts`, writing into `docs/screenshots/`.

---

## Release

Pushing a `v*` tag runs the CI matrix (`.github/workflows/ci.yml`): lint →
typecheck → unit → Playwright e2e → build on macOS/Ubuntu/Windows via
`bunx electrobun sync && bunx electrobun build --env=stable`, then a
`release` job (tag pushes only) downloads every OS's build artifact and
attaches the files under `artifacts/` to a GitHub Release via
`softprops/action-gh-release`. `README.md`'s Download section links
`.../releases/latest`.

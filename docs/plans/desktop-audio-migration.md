# desktop-audio → aueio migration plan

> Goal: a **lightweight** rebuild of desktop-audio (Electron, 23k lines, React contexts + model classes + python analyser) inside `aueio-player-desktop` (Electrobun 2, Bun main process, WebKit webview), with strict separation of concerns, KISS, functional unidirectional state, DTO classes that never touch the view layer, and a UI that never blocks. The existing aueio codebase is nuked (only git history, `.github`, and the repo name survive).

Status: approved 2026-09-18. Implementation layers L0–L9 land as separate PRs on top of this document; each layer updates `docs/AGENTS.md` and this file's checklist.

---

## Context

- **desktop-audio** (`/home/user/desktop-audio`) is feature-rich but heavy: Electron 41 + electron-forge + Vite, 7 build entries, 4 worker threads, `better-sqlite3` native module, a python/essentia analyser that must be checked out beside the repo, a second `BrowserWindow` just for context menus, React contexts holding 2.4k lines of state, a `Model` base class with reflection-based `toJSON`, and 4.7k lines of CSS. Screenshots in `assets/screenshots/` show the target look: near-black surface, one accent colour derived from artwork, thin Montserrat/Geist type, a chord lane in the largest type, a 3D FFT waterfall, sixteen faders.
- **aueio** (`/home/user/aueio-player-desktop`) is an early Electrobun 1.15 + React 19 sketch (~5k lines). Its scanner parses filenames only (`duration` is always 0), the audio server advertises `Accept-Ranges` but never honours `Range`, tests stub the RPC websocket, the ESLint config is hand-rolled with duplicate keys, and a 1 MB bundle is committed. Nothing except the RPC-contract shape, the "reducer preserves current track across refilter" idea, and the CI skeleton is worth keeping.
- **Electrobun moved to 2.x** (npm `electrobun@2.0.1`, docs at `framework.blackboard.sh/electrobun`). 2.x is built by the **Hutch** CLI, runs the main process on **Cottontail** (JSC) by default, and still supports **Bun** as the main-process runtime (`build.mainProcess: "bun"`). We need `bun:sqlite`, `Bun.serve` and `Worker`, so we choose Bun. Imports are `electrobun/main` and `electrobun/view`. There is no custom-scheme API: user media must be served over a local HTTP server (`views://` is read-only bundle assets). Native `ContextMenu` exists on macOS and Windows only.
- **Design baseline** is <https://semantic-nodes.vercel.app/style-guide/>: element-first CSS (`button.primary`, `dialog > header`), design tokens named `--color-*`, `--spacing-*`, `--font-*`, `--border-*`, `--shadow-*`, Sora + JetBrains Mono, minimal component props (`variant`, `size`, `disabled`), no utility classes, no inline styles, `<dialog>` for modals, WCAG AA.
- **Lint baseline** is `@tuomashatakka/eslint-config@4.1.0` (ESLint ≥ 10.4, Node 22): typescript-eslint, `@eslint-react`, `@stylistic`, unicorn, `@eslint/css` (lints the CSS files too: `use-baseline`, `prefer-logical-properties`, `relative-font-units`, `no-important`, `css-strict/prefer-nesting`, `css-strict/block-padding`), and the in-house `react-strict/*` rules (`prefer-no-use-effect`, `no-nested-divs`, `no-style-prop`, `jsx-prop-layout`, `no-jsx-value-calculations`), `ordered/top-level-definitions`, `whitespaced/aligned-assignments`, `no-inline-types/no-inline-multiline-types`.

---

# Part 1 — Specification

## 1. Goals and non-goals

**Goals**

1. Same product, less machinery: library, now playing (art view + analysis view + lyrics layer), settings, tag editor, playlists, keyboard control, artwork-derived accent, a slim DSP page.
2. Every line of state flows one way: `UI event → action → reducer → state → subscribers`. Reducers are pure and synchronous. Side effects live in one folder (`effects/`) and re-enter the loop only by dispatching actions.
3. DTO classes (`Track`, `Album`, `Artist`, `FolderNode`, `Playlist`, `Settings`, `Analysis`, …) are pure TypeScript with zero imports from React, the DOM, or Electrobun. Enforced by an ESLint restricted-path rule, not convention.
4. The UI never waits: every load streams (scan batches, paged hydrate), every decode runs in a Worker, every image is a lazy `<img>` from a local HTTP origin, list rendering uses `content-visibility`, the accent/theme writes are one debounced effect.
5. Minimal semantic HTML; CSS that extends browser defaults instead of resetting them; every rule inside a `@layer` and nested under a module root selector.
6. Toolchain: Bun + Hutch/Electrobun 2 + `@tuomashatakka/eslint-config@4.1.0` + `bun test` + Playwright. No Vite, no PostCSS, no Tailwind, no CSS-in-JS, no Electron.

**Non-goals (explicitly cut or deferred)**

| desktop-audio feature | Decision | Why |
|---|---|---|
| Python/essentia analyser, sibling checkout | **Cut.** Replaced by an in-webview Worker (chroma → key + chords, onset autocorrelation → tempo). | Not shippable; violates "lightweight". |
| Second `BrowserWindow` for context menus | **Cut.** Native `ContextMenu` on mac/win; `<menu popover>` fallback on Linux. | Electrobun gives us native menus. |
| Four height tiers (`normal/snug/compact/mini`) written from JS | **Simplified** to CSS container queries on the shell; two tiers (`bar` + `strip`). | No JS tier state. |
| Sixteen-band EQ + compressor + limiter, knobs, reduction meters | **Simplified** to 10-band ISO octave EQ + limiter, native `<input type=range>` faders, SVG response curve. Compressor deferred. | Half the DOM, same principle (bypass = neutral params). |
| Custom theme editor, import/export, 7 UI fonts, 3 mono fonts, density/corner remaps | **Simplified**: `theme: dark|light|auto`, accent `artwork|custom`, `fontScale`. One UI font (Sora), one mono (JetBrains Mono). | Semantic-nodes baseline has one type system. |
| Playlist folders (nested) | **Simplified**: flat playlists. | KISS. |
| Beat/downbeat markers on the waveform, spectrum note labels, FFT waterfall | Waterfall **kept** (it *is* the analysis view). Beat markers and note labels **deferred** (L8+). | Wallpaper first, decoration later. |
| MPRIS (`mpris-service`, dbus) | **Cut.** `navigator.mediaSession` only. | Native module; MediaSession covers macOS Now Playing and WebKitGTK partially. |
| Browser build (`WebFsDataSource`, IndexedDB) | **Cut.** One host. The `Gateway` interface keeps a `FakeGateway` for tests only. | Two hosts doubled the data layer. |
| Reflection `Model.toJSON`, dirty-tracking setters, debounced auto-flush | **Cut.** DTOs are immutable values; persistence is an explicit action. | Hidden writes fight unidirectional flow. |
| Auto-updater | **Deferred.** Electrobun 2 `Updater` + `release.baseUrl` is a config-only add later. | |

## 2. Runtime and process model

```
┌──────────────────────── Bun main process (src/main) ────────────────────────┐
│ window + app menu + context menu │ settings.json │ bun:sqlite (library.db)   │
│ media HTTP server (127.0.0.1:0, Range 206, token) │ scanner Worker            │
│ typed RPC (electrobun/main): requests ↓, messages ↑                          │
└──────────────────────────────────────────────────────────────────────────────┘
                         │ RPC (JSON over Electrobun's encrypted WS)      ▲
                         ▼                                                │
┌──────────────────────── WebKit webview (src/app) ───────────────────────────┐
│ ui/ (React 19, thin)  ──dispatch──▶  state/ (stores, pure reducers)         │
│        ▲ useStore(selector)                     │ subscribe                  │
│        │                                        ▼                            │
│ effects/ (the only side-effect code) ◀──▶ services/ (Gateway, AudioEngine,  │
│                                              AnalysisWorker, Palette, Keys) │
│ domain/ (DTO classes, pure)  ◀── used by state, services, effects, ui       │
│ workers/analysis.worker.ts (peaks, chroma, key, chords, tempo)              │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Runtime**: `electrobun@^2.0.1`, `build.mainProcess: "bun"`. Verify at L0 that Hutch's vendored Bun ships `bun:sqlite` and `Worker` (it is the real Bun runtime per the docs; if the vendored build lacks either, fall back to `mainProcess: "cottontail"` + `node:sqlite`, and move scanning into `Bun.spawn`-free async batches).
- **Webview**: system WebKit everywhere (`bundleCEF: false`). Baseline is Safari 18 / WebKitGTK 2.46: `@layer`, nesting, `:has()`, `popover`, `<dialog>`, `@property`, `light-dark()`, `color-mix()`, container queries, `content-visibility`, `@starting-style` + `transition-behavior: allow-discrete`. No `requestIdleCallback`, no `scheduler.postTask` in WebKit — use `setTimeout(0)` slices and `MessageChannel` for yielding.
- **Codec caveat** (document in README): WKWebView plays MP3/AAC/ALAC/FLAC/WAV natively; Ogg Vorbis/Opus are not guaranteed. `decodeAudioData` has the same coverage. A track that neither plays nor decodes is marked `unplayable` in the UI, never spins. `bundleCEF` stays a config switch for users who need Ogg.

## 3. Data flow contract (unidirectional, functional)

```
UI event ──► action (plain object, `{ type, ...payload }`)
          ──► store.dispatch ──► reducer(state, action) → state′  (pure, sync)
          ──► listeners: React (useSyncExternalStore) and effects
effects   ──► services (RPC, audio, worker) ──► results dispatched as actions
```

Rules (each is enforced by a test or a lint rule, listed in L1/L9):

1. **One `createStore(reducer, initialState)`** helper (`state/store.ts`): `getState`, `dispatch`, `subscribe`. No middleware, no thunks. Async work is an effect that dispatches `*.requested / *.received / *.failed` actions.
2. **Four stores, four reducers**: `library`, `player`, `settings`, `ui`. Selectors are plain functions `(state) => value`, memoised with a tiny `memo1` for the expensive ones (`filteredTracks`, `groups`, `folderTree`).
3. **DTOs are immutable classes** in `domain/`: `readonly` fields, `static fromJSON(json)`, `toJSON()`, `with(patch)` returning a new instance, and domain methods that only read (`Track.displayTitle`, `Album.duration`, `Queue.next(shuffle, repeat)`). Never a setter, never an event, never an import from `react`, `electrobun`, or the DOM.
4. **`shared/` is the wire contract**: JSON-shaped `interface`s (`TrackJSON`, `SettingsJSON`, …) plus the RPC schema type. Both processes import it; it imports nothing.
5. **React reads through `useStore(store, selector)`** and writes through `dispatch`. Components never call RPC, the audio engine or workers. A component that needs an imperative service (context menu, file dialog) dispatches an action; the effect does the work.
6. **Effects are functions `(stores, services) => dispose`** registered once in `app/index.tsx`. They are the only files allowed to import both `state/` and `services/`.
7. **No `useEffect` in `ui/`** except with the `react-strict/prefer-no-use-effect` justification comment (DOM measurements, canvas). Data subscriptions are effects, not React effects.

## 4. Domain model (DTO classes, `src/app/domain/`)

| Class | Fields (all `readonly`) | Notes |
|---|---|---|
| `Track` | `id` (= path), `path, title, artist, album, albumArtist?, duration, format, size, year?, genre?, trackNumber?, discNumber?, rating?, bpm?, comment?, lyrics?, bitrate?, sampleRate?, channels?, artId?, coverColor, mtimeMs` | `artId` is a content hash; art is fetched by URL, never inline. `displayTitle`, `isUnplayable` derived. |
| `TagPatch` | `Partial<Pick<Track, editable fields>>` | The tag editor's output. |
| `Album`, `Artist` | `key, title/name, tracks: readonly Track[]` + `duration`, `trackCount`, `artId` | Built by selectors, not persisted. |
| `FolderNode` | `path, name, children, trackCount` | Built by `buildFolderTree` (port of desktop-audio `useLibraryScanner.buildFolderTree`). |
| `Playlist` | `id, name, icon, trackIds` + `resolve(byId)` | Persisted in SQLite. |
| `Queue` | `items: readonly string[], index, history` + `next(mode)`, `previous()`, `withInserted()` | Port of `pickIndex` from `AudioContext.tsx`. |
| `PlaybackState` | `status: 'idle'\|'loading'\|'playing'\|'paused'\|'error', trackId, position, duration, volume, shuffle, repeat` | |
| `Settings` | `roots, theme, accentSource, accentColor, fontScale, volume, shuffle, repeat, dsp, showChords, showKey, expandedSize` + `static defaults()`, `normalize(json)` | Port of `normalizeChoice`/`clampRange` from `SettingsContext.tsx`. |
| `DspSettings`, `EqBand` | 10 gains, limiter `{on, threshold, release}` | Port of `DEFAULT_DSP`/`normalizeDsp` shape, 10 bands. |
| `Analysis` | `version, duration, tempo {bpm, confidence}, key {tonic, scale, label}, chords: ChordSegment[]` + `chordAt(t)`, `queuedChords(t, n)` | Port of `AnalysisReadout` helpers. |
| `Keybinding` | reuse `desktop-audio/src/keybindings/*` verbatim (framework-free already) | |

`Waveform` (400 `Float32Array` bars) and the live FFT are **not** DTOs: they are service outputs held in a `Map` inside the player store slice as opaque values.

## 5. RPC contract (`src/shared/rpc.ts`)

Requests execute in main; messages stream to the webview. Payloads are JSON strings over Electrobun's encrypted socket, so **no binary and no artwork ever crosses RPC** — bytes go over the local HTTP server.

```ts
type AppRPC = {
  bun: RPCSchema<{
    requests: {
      'settings.get':    { params: undefined;               response: SettingsJSON }
      'settings.save':   { params: SettingsJSON;            response: void }
      'roots.pick':      { params: undefined;               response: string | null }
      'roots.forget':    { params: { roots: string[] };     response: { removed: number } }
      'library.page':    { params: { after?: string; limit: number }; response: { tracks: TrackJSON[]; next?: string; total: number } }
      'library.scan':    { params: { roots: string[] };     response: { scanId: string } }
      'library.cancel':  { params: { scanId: string };      response: void }
      'track.patchTags': { params: { id: string; patch: TagPatchJSON }; response: TrackJSON }
      'playlists.list':  { params: undefined;               response: PlaylistJSON[] }
      'playlists.save':  { params: PlaylistJSON;            response: void }
      'playlists.delete':{ params: { id: string };          response: void }
      'analysis.get':    { params: { id: string; mtimeMs: number; version: number }; response: AnalysisJSON | null }
      'analysis.put':    { params: { id: string; mtimeMs: number; analysis: AnalysisJSON }; response: void }
      'media.origin':    { params: undefined;               response: { origin: string; token: string } }
      'menu.context':    { params: { menuId: string; items: MenuItemJSON[] }; response: void }   // result arrives as 'menu.action'
      'window.command':  { params: { command: 'minimize'|'maximize'|'close'|'setSize'; width?: number; height?: number }; response: void }
      'shell.open':      { params: { kind: 'external'|'reveal'; target: string }; response: void }
    }
    messages: {}
  }>
  webview: RPCSchema<{
    requests: {}
    messages: {
      'scan.batch':    { scanId: string; tracks: TrackJSON[] }        // ≤ 50 rows, never album_art
      'scan.progress': { scanId: string; seen: number; parsed: number }
      'scan.done':     { scanId: string; total: number; pruned: string[] }
      'scan.error':    { scanId: string; message: string }
      'menu.action':   { menuId: string; actionId: string | null }
      'media.command': { command: 'play-pause' | 'next' | 'previous' }
    }
  }>
}
```

Media URLs: `${origin}/media/${encodeURIComponent(id)}?t=${token}` and `${origin}/art/${artId}?t=${token}`. The server resolves ids through SQLite (never raw paths in URLs), answers `Range` with `206` + `Content-Range`, sets `Accept-Ranges`, `Content-Type` from a small map, `Cache-Control: private, max-age=31536000, immutable` for art, and `Access-Control-Allow-Origin: views://app` (verify the exact webview origin string at L2; `*` as fallback). The token is generated per launch and never persisted.

## 6. Persistence

| Store | Where | Owner | Contents |
|---|---|---|---|
| `library.db` (SQLite, WAL) | `PATHS.userData` | main `db/` | `tracks` (port of desktop-audio `track-schema.ts` minus `album_art`, plus `art_id`, `mtime_ms`), `artwork(id PK, mime, bytes BLOB)`, `track_analysis(track_id PK, source_mtime_ms, version, json)` with the delete trigger, `playlists(id, name, icon, json)` |
| `settings.json` | `PATHS.userData` | main `settings/` | `SettingsJSON`, normalized on read |
| `localStorage` | webview | `ui` store | UI ephemera only: column config, density, grouping, sidebar width, keybindings |

Artwork is deduplicated by SHA-256 of the picture bytes at scan time (one row per album in practice), so `library.page` rows carry a 16-char `artId` and nothing else.

## 7. Library pipeline (async by construction)

1. `settings.get` → roots. `library.page` hydrates in pages of 200 (cursor = last id) — the UI shows the first page in under 100 ms and keeps paging in a `setTimeout(0)` loop.
2. `library.scan` returns immediately with a `scanId`; main posts `{ roots, scanId }` to the **scanner Worker** (`src/main/library/scanner.worker.ts`, own `bun:sqlite` connection).
3. Worker walks roots with `readdir({ withFileTypes: true })`, checks `mtime_ms` against the DB (unchanged → serve stored row), else `music-metadata.parseFile(path, { duration: true })`, extracts picture → hash → `artwork` upsert, upserts the track, and posts batches of 50. Filename fallbacks and `coverColor` hash are ported from `scanner-worker.ts`.
4. Main relays batches as `scan.batch`. The webview `libraryEffect` coalesces batches per animation frame (port of `useLibraryScanner`'s rAF coalescing) and dispatches one `library/batchReceived` per frame.
5. `scan.done` carries pruned ids (rows under the scanned roots that were not rediscovered — `rootScopeClause` port). The reducer removes them.
6. Folder tree and album/artist indexes are selectors computed lazily and memoised on the `tracks` array identity, recomputed in a yielding slice if `tracks.length > 5000`.

## 8. Playback pipeline

- `AudioEngine` (`services/audio/engine.ts`): one `AudioContext`, one `HTMLAudioElement` (`crossOrigin='anonymous'`, `preload='metadata'`, src = media URL), `createMediaElementSource → dspChain.input`; `dspChain.output → GainNode (volume) → AnalyserNode (fftSize 4096) → destination`. Volume moves onto the gain node (fixes the documented desktop-audio limitation).
- Engine emits `timeupdate` (throttled to 4 Hz for the store; the seek bar animates via CSS `transition` between updates), `ended`, `error`, `durationchange`. `playerEffect` maps them to actions.
- `navigator.mediaSession` metadata + handlers set from `playerEffect`; `media.command` messages (app menu accelerators) dispatch the same actions.
- **Waveform + analysis**: on track start, `analysisEffect` fetches the media URL as `ArrayBuffer`, `decodeAudioData` (native, off-thread), downmixes to mono `Float32Array`, and `postMessage`s it (transferable) to `analysis.worker.ts`. Worker replies `{ peaks: Float32Array(400) }` first (fast), then `{ analysis }` (seconds). Results are cached in SQLite via `analysis.put`; `analysis.get` is tried first. The current track always preempts (worker `AbortSignal` via a version counter). Decode failure → `track.unplayable` flag, readout says why.
- DSP chain: port `dspChain.ts` with `EQ_BANDS` reduced to 10 ISO octave centres (31.5 … 16k, shelves at the edges), `BAND_Q`, `PARAM_GLIDE`, "bypass = neutral parameters" and `eqResponse.ts` unchanged. Compressor dropped.

## 9. Analysis algorithms (worker, no dependencies)

| Output | Method | Budget |
|---|---|---|
| Peaks (400) | per-bar RMS, normalised to `[0.07, 1]` (port of `decodeWaveformBars`) | < 50 ms |
| Chroma | STFT 4096/2048 with Hann, bins → 12 pitch classes (log-frequency fold, 55–4200 Hz), per-frame L2 normalise | ~1 s / 5 min |
| Key | Krumhansl–Schmuckler correlation of the mean chroma against 24 profiles; `confidence` = margin between best and second | trivial |
| Chords | 24 triad templates (maj/min) per 0.5 s frame, median filter (5 frames), merge runs into `ChordSegment[]`; label with sharps | trivial |
| Tempo | spectral-flux onset envelope (hop 512), autocorrelation over 60–200 BPM, pick peak, refine by parabolic interpolation | ~0.5 s |
| Meter | derived in the readout (`meterOf` port) from beat count per chord run — deferred | |

`Analysis.version = 1`; bumping invalidates the SQLite cache. No `essentia.js` (AGPL, 10 MB, unmaintained since 2021), no `meyda` (features only, 2024), no `aubiojs` (2022). `web-audio-beat-detector` is the only candidate worth keeping in mind as a drop-in if the hand-rolled tempo estimate is poor on real material; it needs an `AudioBuffer` on the main thread, so it would run in `analysisEffect`, not the worker.

## 10. Design system and CSS architecture

**Tokens** (`styles/tokens.css`, `@layer tokens`) adopt the semantic-nodes names and scales, values tuned to the desktop-audio look:

- `--color-neutral-{50…950}`, `--color-primary-{50…900}` (primary = accent hue, overridden live), `--color-semantic-{success,warning,error,info}-{50,500,700}`, `--color-base-{white,black}`.
- Roles via `light-dark()`: `--surface`, `--surface-raised`, `--surface-input`, `--ink`, `--ink-dim`, `--ink-muted`, `--line`, `--line-hover`, `--focus-ring`. `:root { color-scheme: light dark }`, `[data-theme='dark'|'light']` pins `color-scheme`; `auto` is just the absence of the attribute — no JS media-query listener.
- `--accent` registered with `@property { syntax: '<color>'; inherits: true; initial-value: … }` so artwork changes cross-fade for free; `--accent-contrast` likewise. `--art-vibrant/-muted/-dark/-light` registered the same way (port of the five `@property` art tokens).
- `--spacing-{0,px,0-5,1…12,16,20,24}`, `--font-size-{xs,sm,md,lg,xl,2xl…6xl}`, `--font-weight-*`, `--font-line-height-*`, `--border-width-{1,2}`, `--border-radius-{none,small,base,large,full}`, `--shadow-{shallow,base,elevated,floating}`, motion `--duration-{fast,base,slow}`, `--ease`, `--ease-emphasis`; structural `--titlebar-h`, `--player-bar-h`, `--sidebar-w`, `--row-h`.
- `--font-family-sans: Sora, system-ui, …`, `--font-family-mono: 'JetBrains Mono', ui-monospace, …`. Both bundled as variable woff2 (OFL) in `styles/fonts/`.

**Layers and files** (`styles/main.css` declares the order, one file per layer, nothing else in it):

```css
@layer fonts, tokens, base, components, layout, views, states, utilities;
```

| File | Layer | Rule |
|---|---|---|
| `fonts.css` | fonts | `@font-face` only |
| `tokens.css` | tokens | every custom property, `@property`, `:root`, `[data-theme]` — nowhere else (test enforced) |
| `base.css` | base | **element selectors only**, extending browser defaults: `body`, headings, `button`, `input`, `select`, `dialog`, `details/summary`, `table`, `menu`, `progress/meter`, `kbd`, `figure`, `search`, `output`. The only "reset" is `*, ::before, ::after { box-sizing: border-box }` and `img, svg { display: block; max-inline-size: 100% }` |
| `components.css` | components | named things used in more than one view: `.button` variants (`button.primary/.ghost/.icon`), `.waveform`, `.cover`, `.rating`, `.eq-fader`, `.chord-lane`, `.frequency-matrix`, `.menu` — each nested under its own root |
| `layout.css` | layout | the shell only: `body > .shell` grid, `header.titlebar`, `aside.sidebar`, `main`, `footer.player`, and every `@container shell (...)` block |
| `views.css` | views | one root per screen: `main[data-view='library'] { … }`, `main[data-view='settings']`, `dialog.tag-editor`, `section.player[data-expanded]`, `section.dsp` |
| `states.css` | states | cross-cutting attribute states: `[aria-busy]`, `[data-loading]`, `[aria-pressed]`, `[data-selected]`, `:focus-visible` ring, reduced motion |
| `utilities.css` | utilities | `.sr-only`, `.fade-y`, `.truncate` — that's it |

Conventions: native nesting, never BEM; variants as short classes on the semantic element (`button.primary`); state as attributes the component already sets (`[data-open]`, `[aria-pressed]`, `[data-mode]`); every rule under a module root selector wrapped in `:where()` where specificity must stay flat; `css-strict/prefer-nesting` will force nesting anyway. Logical properties only (`inline-size`, `padding-block`), rem units, no `!important` (lint errors).

**Modern CSS carrying features that used to be JS**: container queries replace `data-height-tier`; `@starting-style` + `allow-discrete` replace the always-mounted-then-animate trick's JS half (the "one DOM" rule stays); `content-visibility: auto; contain-intrinsic-block-size: auto var(--row-h)` replaces `@tanstack/react-virtual` for flat lists (measure at L8; fall back to `@tanstack/virtual-core` only if WebKit stutters past 10k rows); `popover` + `anchor-name`/`position-anchor` for the column picker and Linux context menu (with a JS `getBoundingClientRect` fallback for WebKitGTK < 2.48); `light-dark()` replaces the theme media listener; `scroll-timeline` for the library header collapse.

## 11. Markup (semantic, minimal)

```html
<body>
  <div class="shell">                              <!-- container: shell -->
    <header class="titlebar electrobun-webkit-app-region-drag">
      <button class="icon" aria-controls="sidebar" aria-expanded>…</button>
      <h1>aüeio</h1>
      <search><input type="search" name="q" /></search>
      <nav aria-label="Window">…</nav>            <!-- no-drag -->
    </header>
    <aside id="sidebar" class="sidebar">
      <details name="sidebar" open><summary>Playback</summary><menu>…</menu></details>
      <details name="sidebar"><summary>Folders</summary><ul role="tree">…</ul></details>
      <details name="sidebar"><summary>Playlists</summary><ul>…</ul></details>
    </aside>
    <main data-view="library">                    <!-- or settings -->
      <header>…breadcrumbs, toolbar (fieldset of radio buttons for grouping / density)…</header>
      <table aria-rowcount>…</table>              <!-- flat list; grouped views use <section> per group -->
    </main>
    <footer class="player"><section class="player" data-mode data-lyrics>…one markup…</section></footer>
  </div>
  <section class="player" data-expanded popover="manual">…the same Player component…</section>
  <dialog class="settings">…</dialog>
  <dialog class="tag-editor"><form method="dialog">…</form></dialog>
  <section class="dsp" popover="manual">…</section>
  <menu class="context" popover>…</menu>          <!-- Linux fallback -->
</body>
```

The player keeps desktop-audio's **one-DOM invariant**: the `Player` component renders identical markup in the footer and in the expanded overlay; `expanded` only selects values (who owns the rAF loop). A test compares both copies' `innerHTML`. Title, seek bar and transport are always mounted and visible in every mode.

## 12. Accessibility and keyboard

- WCAG AA contrast on accent: port `contrastLift` from `desktop-audio/src/app/utils/color.ts` verbatim.
- Landmarks as above; `role="tree"` folder tree with the roaming tabindex port of `useTreeNavigation`; table rows with `aria-selected`; `aria-live="polite"` status line for scan progress and analysis state; `<progress>` for scan/analysis; `prefers-reduced-motion` collapses `--duration-*` to `1ms` at token level.
- Keybindings: copy `desktop-audio/src/keybindings/{types,defaults,keyboard,store,index}.ts` into `src/app/services/keybindings/` unchanged (12 defaults, conflict detection, `localStorage` adapter). `keyboardEffect` maps actions to dispatches with the same editable-target gating as `useKeyboardShortcuts`. Settings → Hotkeys edits them.
- App menu (`ApplicationMenu.setApplicationMenu`) mirrors the defaults with `accelerator`s and emits `media.command`.

## 13. Performance budget

| Metric | Target | Mechanism |
|---|---|---|
| First paint after launch | < 300 ms | static HTML + CSS, React root mounts with empty stores, first `library.page` renders when it lands |
| 20k-track library hydrate | first rows < 100 ms, full < 3 s, no frame > 50 ms | paged `library.page`, per-frame batch coalescing, `content-visibility` |
| Rescan of unchanged library | zero re-parse | `mtime_ms` check in the worker |
| Track change to first audio | < 150 ms | `<audio>` streams from the range server; nothing waits on decode |
| Waveform appears | < 500 ms after start | worker peaks message sent before analysis |
| Main thread work per `timeupdate` | 0 allocations in reducers, one store notify at 4 Hz | throttled engine events, CSS-driven seek bar |
| RPC payload | ≤ 50 tracks / message, no base64 | server-side artwork |

## 14. Dependency selection

| Need | Chosen | Version | Rationale / rejected alternatives |
|---|---|---|---|
| Desktop shell | `electrobun` | `^2.0.1` | Hutch CLI + Bun runtime; `views://` bundle; native menus, dialogs, tray, updater. 1.15 patch for `rmdirSync` is obsolete (drop `patchedDependencies`). |
| View layer | `react`, `react-dom` | `^19.2` | Kept: both repos use it, eslint-config 4.1.0 ships `@eslint-react` + `react-strict`. Kept thin: no contexts for data, `useSyncExternalStore` only. |
| Tags | `music-metadata` | `^11.15` | Pure JS, reads every container we serve; runs in the scanner Worker. |
| SQLite | `bun:sqlite` | built-in | No native module to rebuild (vs `better-sqlite3`). |
| Lint | `@tuomashatakka/eslint-config` + `eslint` | `4.1.0`, `^10.4` | Required by the task; lints CSS too, so stylelint is unnecessary. |
| Types | `typescript`, `@types/bun`, `@types/react`, `@types/react-dom` | latest | tsconfig extends `.hutch/devkit/tsconfig.json`. |
| E2E | `@playwright/test` | `^1.58` | Pre-installed Chromium in CI; WebKit project added for parity (`playwright install webkit`). |
| Virtualisation | — (CSS `content-visibility`) | | `@tanstack/virtual-core` only if L8 measurements demand it. |
| Palette | — (port `extractPalette`) | | `colorthief`/`node-vibrant` rejected: 100 lines of canvas sampling already exist and are tested. |
| Analysis | — (worker, §9) | | `essentia.js` rejected (AGPL, 10 MB, 2021); `meyda`, `aubiojs` rejected (stale / partial). |
| Beat detection | (optional) `web-audio-beat-detector` `^8.2` | | Only if §9's tempo estimate underperforms. |
| Fonts | Sora, JetBrains Mono (OFL woff2) | | Semantic-nodes baseline. Montserrat/Geist/Departure not carried over. |

Removed from aueio: `three`, `@types/three`, `eslint-plugin-functional`, `eslint-plugin-unicorn` (comes via the config), `eslint-plugin-import`, `eslint-plugin-omit-unnecessary`, `@stylistic/eslint-plugin` (via config), `typescript-eslint` (via config), the electrobun patch, `src/app/index.js`, `debug-test*.mjs`, `static.yml`.

## 15. Tooling and repository layout

```
aueio-player-desktop/
├── electrobun.config.ts       app{name,identifier,version}, build{mainProcess:'bun', bun:{entrypoint:'src/main/index.ts'}, views:{app:{entrypoint:'src/app/index.tsx'}}, copy:{'src/app/index.html':'views/app/index.html','src/app/styles':'views/app/styles'}, mac/linux/win{bundleCEF:false}}
├── hutch.config.ts            packageManager:'bun', scripts{install,dev,build,build:stable}
├── tsconfig.json              extends ./.hutch/devkit/tsconfig.json; strict, noUncheckedIndexedAccess, jsx react-jsx
├── eslint.config.mjs          import config from '@tuomashatakka/eslint-config'; + restricted-paths zones (§3) + bun globals for src/main
├── package.json               scripts: dev, build, lint, lint:fix, typecheck, test (bun test), test:e2e (playwright), check (lint+typecheck+test)
├── playwright.config.ts
├── src/
│   ├── shared/                rpc.ts, dto.ts (JSON interfaces), constants.ts (extensions, mime, versions)
│   ├── main/                  index.ts, window.ts, menus.ts, rpc/handlers.ts, settings/store.ts,
│   │                          db/{schema,repository}.ts, library/{scanner.worker,metadata,artwork}.ts,
│   │                          media/server.ts
│   └── app/
│       ├── index.html, index.tsx (composition root)
│       ├── domain/            DTO classes (§4)
│       ├── state/             store.ts, {library,player,settings,ui}/{actions,reducer,selectors}.ts
│       ├── services/          gateway/{Gateway.ts,RpcGateway.ts,FakeGateway.ts}, audio/{engine,dspChain,eqResponse}.ts,
│       │                      analysis/{client.ts, analysis.worker.ts, chroma.ts, key.ts, chords.ts, tempo.ts, peaks.ts},
│       │                      palette/{extract,color}.ts, keybindings/*, menu/{native,popover}.ts
│       ├── effects/           library.ts, player.ts, analysis.ts, appearance.ts, keyboard.ts, media-session.ts, persistence.ts, index.ts
│       ├── ui/                hooks/{useStore,useDispatch}.ts, layout/{Shell,Titlebar,Sidebar}.tsx,
│       │                      views/{Library,Settings,TagEditor,Dsp}.tsx, components/{Player,TrackTable,LibraryGrid,
│       │                      Waveform,ChordLane,FrequencyMatrix,EqCurve,Rating,Cover,ContextMenu}.tsx
│       └── styles/            main.css + one file per layer + fonts/
├── tests/
│   ├── unit/                  bun test — domain/, state/, services/analysis/, main/db, main/media (mirrors src)
│   ├── e2e/                   playwright — library, player, settings, tag-editor specs; screenshots/
│   └── fixtures/              3 tiny audio files (wav/mp3/flac, CC0), one with embedded art + lyrics
├── docs/                      AGENTS.md (rewritten), plans/desktop-audio-migration.md (this file), keybindings.md, music-analysis.md
└── .github/workflows/ci.yml   lint → typecheck → unit → e2e → build matrix (hutch electrobun build --env=stable)
```

CSS is copied, not bundled: `index.html` links `views://app/styles/main.css`, which `@import`s the layer files in order. Verify at L0 that `build.copy` accepts a directory; if not, list the eight files.

## 16. Testing strategy

- **`bun test`** (fast, no DOM): every DTO (`fromJSON`/`toJSON` round trip, `with`, immutability), every reducer (table-driven action → state), every selector, `Queue.next` across shuffle/repeat, `Settings.normalize` against garbage, `buildFolderTree`, `tracksForPayload`, analysis math on synthetic signals (a 440 Hz sine → key A, a click track at 120 BPM → tempo 120 ± 1), `db/repository` against an in-memory `bun:sqlite`, `media/server` range arithmetic, `schema.migrate` idempotence, and the **CSS invariants** (only `tokens.css` declares `--*` on `:root`/`[data-theme]`; every top-level rule in `views.css` starts with a module root; `main.css` layer order matches file order).
- **Playwright** against `hutch electrobun build --env=dev` output served statically with `?gateway=fake` (the composition root swaps `RpcGateway` for `FakeGateway` seeded with `tests/fixtures`): library renders and filters, grouping/density toggles, double-click plays (the `<audio>` element gets a `src`), the two player copies' `innerHTML` are byte-equal, settings persist, tag editor patches a row, keyboard defaults fire, the Linux popover menu opens **after `pointerup`** (`afterPointerRelease` port) — plus screenshot baselines for the four main screens in dark and light.
- **Smoke in a real window** (documented checklist, not automated): native context menu on macOS, media keys, range seeking on a 100 MB FLAC, Ogg fallback message.

---

# Part 2 — Implementation layers

Each layer is one PR on `claude/desktop-audio-aueio-migration-sjd3zx` (or a stacked branch off it), lands green (`bun run check`), and updates `docs/AGENTS.md`. Layers L1–L5 have no UI and are fully unit-testable; L6+ is where pixels appear. Reuse pointers name the desktop-audio file to port; "port" means copy, strip React/Electron imports, keep the tests.

### L0 — Nuke and scaffold

**Delete**: everything under `src/`, `tests/`, `docs/` (keep `docs/` dir), `patches/`, `debug-test*.mjs`, `bun.lock`, `.github/workflows/static.yml`, `README.md` (rewrite).

**Create**:
1. `package.json` with the dependencies in §14 and scripts: `dev` (`hutch electrobun dev --watch`), `build`, `build:stable`, `lint` (`eslint .`), `lint:fix`, `typecheck` (`tsc --noEmit`), `test` (`bun test tests/unit`), `test:e2e`, `check`.
2. `hutch.config.ts` (`packageManager: 'bun'`), `electrobun.config.ts` (§15), `tsconfig.json` extending `.hutch/devkit/tsconfig.json`.
3. `eslint.config.mjs`: default export of `@tuomashatakka/eslint-config` plus one override block adding `globals.bun` (or `globals.node`) for `src/main/**` and the `import-x/no-restricted-paths` zones from §3.
4. `src/main/index.ts`: one `BrowserWindow({ title, url: 'views://app/index.html', titleBarStyle: 'hiddenInset', frame })`, `src/app/index.html` with the shell skeleton from §11 (static, no React yet), `src/app/index.tsx` mounting an empty React root, `styles/main.css` with the layer declaration and empty files.
5. `.claude/settings.json`: keep the `PostToolUse` lint-fix hook.
6. CI: `ci.yml` with lint/typecheck/unit/e2e jobs on Ubuntu (install `libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev`), build matrix mac/ubuntu/windows using `hutch` (curl installer) with `--env=stable`, artifacts from `artifacts/`.

**Verify before merging**: `hutch install && hutch electrobun sync && hutch run dev` opens a window with the static shell; `bun:sqlite` and `new Worker()` work from `src/main` (a 5-line probe, removed after); `build.copy` of a directory works; the webview origin string for CORS is logged; `bun run check` is green on an empty tree.

### L1 — Shared contract

Files: `src/shared/dto.ts` (`TrackJSON`, `TagPatchJSON`, `SettingsJSON`, `PlaylistJSON`, `AnalysisJSON`, `MenuItemJSON`), `src/shared/rpc.ts` (§5, `RPCSchema` from `electrobun/main` types only — `import type`), `src/shared/constants.ts` (`AUDIO_EXTENSIONS`, `MIME_BY_EXTENSION`, `ANALYSIS_VERSION`, `SCAN_BATCH_SIZE = 50`, `PAGE_SIZE = 200`).

Reuse: field list from `desktop-audio/src/track-schema.ts` `TRACK_COLUMNS`; extension list from `scanner-worker.ts`.

Tests: type-level (`tests/unit/shared/rpc.test-d.ts` via `expectTypeOf`) that every request name is a string literal union used by both sides.

### L2 — Main process

1. `settings/store.ts`: read/normalize/write `settings.json` under `PATHS.userData` (`Settings.normalize` lives in `domain`, but main must not import `app/`; so put the pure normaliser in `shared/settings.ts` and have `domain/Settings` wrap it).
2. `db/schema.ts`: port `track-schema.ts` (`createTableSql`, `migrate` via `PRAGMA table_info`, `upsertSql`, `rowToDto`, `toCamel/toSnake`, `rootScopeClause`) to `bun:sqlite`; add `artwork`, `track_analysis` (port `analysis-schema.ts` incl. the delete trigger), `playlists`. `db/repository.ts`: `openLibrary(path)` returning `{ pageTracks, upsertTracks, patchTags, forgetRoots, pruneNotIn, artwork.{get,put,has}, analysis.{get,put}, playlists.{list,save,delete} }`, all prepared statements, WAL + `synchronous=NORMAL`.
3. `library/scanner.worker.ts`: §7 step 3. `library/metadata.ts` wraps `music-metadata` (`parseFile`, `ratingToStars`, lyrics/comment folding ported from `scanner-worker.ts`). `library/artwork.ts` hashes and stores pictures. One worker instance for the process lifetime; a `Map<scanId, AbortController>` for `library.cancel`.
4. `media/server.ts`: `Bun.serve({ hostname: '127.0.0.1', port: 0 })`, routes `/media/:id` and `/art/:artId`, token check, Range parsing (`bytes=a-b`, `bytes=a-`, `bytes=-n`), 206/416, `Bun.file(path).slice(start, end + 1)`.
5. `rpc/handlers.ts`: one function per request in §5, each ≤ 15 lines delegating to the modules above. `index.ts` wires `BrowserView.defineRPC<AppRPC>`, `Electrobun.events.on('context-menu-clicked')` → `menu.action`, `ApplicationMenu.setApplicationMenu` (Playback/View/Window menus with accelerators → `media.command`), `before-quit` closes the DB.
6. `window.ts`: `window.command` handling, remember `expandedSize` on resize (debounced) through `settings.save`.

Tests (`bun test`, in-memory SQLite, temp dirs): repository CRUD and prune; migrate twice is a no-op; scanner on `tests/fixtures` yields 3 tracks with durations > 0 and one `artId`; rescan reparses nothing (spy on `parseFile`); range server returns `206` with correct `Content-Range` and `416` for out-of-range; unknown id → 404; wrong token → 403.

### L3 — Domain (DTO classes)

`src/app/domain/*.ts` per §4. Pattern for every class:

```ts
export class Track {
  private constructor (readonly id: string, readonly title: string, /* … */) {}
  static fromJSON (json: TrackJSON): Track { /* validate, default, freeze */ }
  toJSON (): TrackJSON { /* plain object */ }
  with (patch: Partial<TrackJSON>): Track { return Track.fromJSON({ ...this.toJSON(), ...patch }) }
  get displayTitle (): string { … }
}
```

Reuse: `pickIndex` (`AudioContext.tsx`) → `Queue.next`; `normalizeChoice`/`clampRange`/`normalizeDsp` (`SettingsContext.tsx`, `dspChain.ts`) → `Settings.normalize`; `chordAt`/`firstAfter`/`queuedChords` (`AnalysisReadout.tsx`) → `Analysis`; `buildFolderTree` (`useLibraryScanner.ts`) → `FolderNode.build`; `bucketKey`/`groupLabel`/`buildGroups` (`utils/grouping.ts`) → `Album`/`Artist` indexes; `DragPayload`/`tracksForPayload` (`utils/dnd.ts`) → `domain/drag.ts`; `utils/time.ts`, `utils/pitch.ts`, `utils/color.ts` copied to `domain/` or `services/` as pure modules with their tests.

Lint gate: `import-x/no-restricted-paths` — `src/app/domain/**` may import only `src/shared/**` and itself.

Tests: round-trips, `with` immutability (`Object.isFrozen`), `Queue` across all `(shuffle × repeat)` combinations, `Settings.normalize` fuzz, folder tree on mixed separators, drag resolution.

### L4 — State (stores, reducers, selectors)

1. `state/store.ts`: `createStore<S, A>(reducer, initial)` → `{ getState, dispatch, subscribe }`; `subscribe` returns `dispose`; `dispatch` is re-entrancy-safe (queue while notifying). `state/memo.ts`: `memo1(fn)` keyed on reference identity.
2. `state/library/`: state `{ byId: ReadonlyMap<string, Track>, order: readonly string[], roots, scan: { id, seen, parsed, status }, playlists, search, selection: { anchor, ids } }`; actions `pageReceived`, `batchReceived`, `scanStarted/Progress/Done/Failed`, `tagsPatched`, `rootsChanged`, `playlistSaved/Deleted`, `searchChanged`, `selectionChanged`; selectors `filteredTracks` (deferred search port), `groups(grouping)`, `folderTree`, `subfolderRows` (port of `utils/folders.ts` single-pass counting), `byPlaylist`.
3. `state/player/`: state `{ playback: PlaybackState, queue: Queue, waveforms: ReadonlyMap<id, Float32Array>, analyses: ReadonlyMap<id, Analysis | 'pending' | { error }>, dsp }`; actions `playRequested(ids, startIndex)`, `engineStarted/Paused/Ended/Errored/Time(position, duration)`, `seekRequested`, `volumeChanged`, `shuffleToggled`, `repeatCycled`, `waveformReceived`, `analysisReceived/Failed`, `dspChanged`.
4. `state/settings/`: `{ settings: Settings, ready: boolean }`; `loaded`, `changed(patch)`.
5. `state/ui/`: `{ view: 'library'|'settings', overlay: 'player'|'dsp'|'tag-editor'|null, playerMode, lyricsOpen, sidebarOpen, scope: { folder | playlist | list | group }, density, grouping, columns, editingTrackId, contextMenu }`; port the scope semantics from `UIContext.tsx` (`selectGroup` keeps the folder) and `useColumnConfig`'s reconcile-against-defaults.

Reuse: `applyFiltersAndSort` current-track preservation (aueio `reducer.ts`) → `library/selectors.ts`; `useSortableTable` `NUMERIC_KEYS` and natural-order rule; `useRowSelection` click/ctrl/shift semantics as a pure `selectionAfterClick(state, id, modifiers)`.

Tests: table-driven reducer specs (`[state, action] → expected`), selector memo identity, store re-entrancy, `selectionAfterClick` matrix.

### L5 — Services

1. `services/gateway/Gateway.ts`: an interface mirroring §5 as async methods plus `on(message, handler): dispose`. `RpcGateway.ts` implements it with `Electroview.defineRPC<AppRPC>` from `electrobun/view` (`maxRequestTime` 30 s; scans are messages so no timeout applies). `FakeGateway.ts` implements it over `tests/fixtures` with a fake timer for scan batches.
2. `services/audio/engine.ts`: §8 graph, typed event emitter, `load(url)`, `play/pause/seek/setVolume`, `analyser` getter, `dispose`. `dspChain.ts` and `eqResponse.ts` ported with 10 bands; `apply(dsp)` diffs against the last applied.
3. `services/analysis/`: `client.ts` (`analyze(id, url, signal) → AsyncIterable<{ peaks } | { analysis }>`, decode on main thread, transfer to worker, version counter for preemption); `analysis.worker.ts` + `peaks.ts`, `chroma.ts`, `key.ts`, `chords.ts`, `tempo.ts` per §9.
4. `services/palette/extract.ts`: port `extractPalette` and its constants from `useAmbientPalette.ts`; `color.ts`: port `contrastLift`, `relativeLuminance`, `parseColor`.
5. `services/keybindings/`: verbatim copy of `desktop-audio/src/keybindings/`.
6. `services/menu/native.ts` (`gateway.showContextMenu` + await `menu.action`) and `popover.ts` (Linux: position `<menu popover>` at the pointer via `afterPointerRelease`, port of `utils/events.ts`).

Tests: engine against a stubbed `AudioContext`; `dspChain` neutral-parameter bypass; `eqResponse` at 0 dB is flat; analysis modules on synthetic signals (§16); palette on a 2×2 canvas fixture; keybindings suite copied over; `RpcGateway` with a mocked `Electroview`.

### L6 — Effects (wiring)

`src/app/effects/*.ts`, each `(stores, services) => dispose`, registered in `effects/index.ts` and called once from `app/index.tsx`:

| Effect | Listens to | Does |
|---|---|---|
| `bootstrap` | start | `settings.get` → `settings/loaded`; `media.origin`; `library.page` loop; `playlists.list`; then `library.scan(roots)` |
| `library` | `scan.batch/progress/done/error`, `rootsChanged`, `tagsPatched` | rAF-coalesced `batchReceived`; `roots.forget` + rescan on removal; `track.patchTags` |
| `player` | `playRequested`, `seekRequested`, `volumeChanged`, engine events, `media.command` | `engine.load(mediaUrl(id))`, dispatch engine events; auto-advance via `Queue.next` on `ended` |
| `analysis` | `engineStarted` (new track) | `analysis.get` → hit: dispatch; miss: run client, dispatch `waveformReceived` then `analysisReceived`, `analysis.put` |
| `appearance` | settings + palette changes | **the single writer** of `data-theme`, `--accent`, `--accent-contrast`, `--art-*`, root `font-size`; debounced to one write per frame |
| `mediaSession` | playback + track | `navigator.mediaSession` metadata (art URL) and action handlers |
| `keyboard` | `keydown` on `window` | `actionForEvent` → dispatch, with editable-target gating |
| `persistence` | `ui` slice changes, `settings/changed` | `localStorage` writes (try/catch), `settings.save` (debounced 300 ms) |
| `contextMenu` | `ui/contextMenuRequested` | native or popover path by `window.__electrobunPlatform`; result → `ui/contextMenuActioned` |

Tests: each effect with `FakeGateway` + fake engine: dispatch sequence assertions; `appearance` writes exactly once per frame; `player` never calls `engine.load` for `repeat: 'one'` (re-seek only, port of the `advanceRef` rule).

### L7 — Styles

1. `tokens.css` per §10 (dark values from `desktop-audio/src/app/styles/tokens.css` — near-black `#0f0f11`-class surface, `#00e5d1` default accent; light values from the semantic-nodes light `:root`). `fonts.css` with two variable woff2s. `base.css` element extensions: `button` (unstyled default, `.primary` pill), `input[type=range]` (thin track, accent thumb), `dialog` (`border: 0; background: var(--surface-raised); box-shadow: var(--shadow-floating)`, `::backdrop` blur), `details > summary` (list-style none, chevron via `::marker` replacement), `table` (sticky `thead`, `content-visibility` on `tr`), `menu` (reset list, `popover` positioning), `progress`/`meter` accent, `kbd`.
2. `layout.css`: `.shell` grid (`grid-template: 'title title' var(--titlebar-h) 'side main' 1fr 'player player' var(--player-bar-h) / var(--sidebar-w, 0) 1fr`), `container-type: size; container-name: shell`, and `@container shell (max-height: 300px)` → strip player (art 40px, title + progress hairline), `@container shell (max-width: 640px)` → sidebar overlays. Titlebar drag classes.
3. `components.css`: `.cover` (`<figure>` with `<img loading=lazy decoding=async>`, `aspect-ratio: 1`, `background: var(--cover-color)` while loading), `.waveform` (SVG path over a native range input, `--wf-played/--wf-unplayed`), `.rating`, `.chord-lane` (`--chord-pps` port), `.frequency-matrix` (SVG, `--matrix-wallpaper`), `.eq-fader` (vertical range via `writing-mode: vertical-lr; direction: rtl`), `.menu.context`.
4. `views.css`: `main[data-view='library']` (header with `scroll-timeline` collapse, breadcrumbs, toolbar fieldsets, table columns from `--columns` set by the column config), `main[data-view='settings']` (`<form>` of `<fieldset>`s), `dialog.tag-editor`, `section.player[data-expanded]` (`[data-mode='analysis']` fades `.cover` up and out, `[data-lyrics]` translates content), `section.dsp`.
5. `states.css`, `utilities.css`.

Tests (`bun test` over the files): token contract; every top-level selector in `views.css`/`components.css` matches an allowed root; no `px` font sizes; layer order; `bun run lint` (CSS rules) green.

### L8 — UI (React, thin)

Order inside the layer: shell → library → player → settings → tag editor → dsp. Every component: props ≤ 4, no `style`, no nested `div`s, reads with `useStore(selector)`, writes with `dispatch`, no `useEffect` without justification.

1. `ui/hooks/useStore.ts` (`useSyncExternalStore(store.subscribe, () => selector(store.getState()))`), `useDispatch`, a `StoresContext` created once in `index.tsx`.
2. `layout/Shell.tsx`, `Titlebar.tsx` (search `<search>`, window buttons dispatch `window.command`), `Sidebar.tsx` (`<details name="sidebar">` exclusive sections; folder `role="tree"` with roaming tabindex port; playlists; footer buttons for DSP/Settings; drop target using `domain/drag`).
3. `views/Library.tsx` + `components/TrackTable.tsx` (flat `<table>` with `content-visibility` rows, `aria-rowcount`, column config from `ui` store, header `contextmenu` → column picker `popover`, row selection dispatches, double-click → `playRequested`, drag source) + `LibraryGrid.tsx` (`<ul>` of `<article>` cards) + `Breadcrumbs.tsx`. Grouped rendering: one `<section>` per group with `<h2>` heading (`<button>` toggle, alt-click toggles all).
4. `components/Player.tsx`: one markup (§11), `data-mode`, `data-lyrics`, `data-empty`; children `Cover`, `Waveform` (SVG + `<input type=range>` seek), `Transport` (`<menu>` of buttons: shuffle/prev/play/next/repeat with `aria-pressed`/`data-repeat`), `ChordLane` + `Readout` (`<dl>` of Key/Tempo/Chord), `FrequencyMatrix` (rAF loop only in the expanded copy; port of the 3D waterfall math with `BANDS 40`, `HISTORY 28`), `Lyrics` (`<pre>`-free `<p>` per line; `useLyricsScroll` port as a small hook with a justified effect). The two copies are byte-identical (test).
5. `views/Settings.tsx`: `<form>` of `<fieldset>`s (Library roots with `roots.pick`; Appearance: theme radio, accent source, colour input, font scale range; Playback; Analysis toggles; Hotkeys: table of `<kbd>` inputs using the keybinding store; About).
6. `views/TagEditor.tsx`: `<dialog>` + `<form method="dialog">`, primary fields, `<details>` for extended; submit → `tagsPatched` via effect. Three doors kept: row context menu, card context menu, `mod+i`.
7. `views/Dsp.tsx`: 10 vertical faders + `EqCurve` SVG (port: real cascade response over the live analyser spectrum on one log axis; `axisPosition/axisFrequency` from `eqResponse.ts`), limiter toggle + two ranges.
8. `components/ContextMenu.tsx`: the Linux `<menu popover>`; native path has no component.

Verify: `bun run test:e2e` with `FakeGateway`; then the manual smoke list. Measure the 20k-row table with the Performance panel; adopt `@tanstack/virtual-core` only if a frame exceeds 50 ms.

### L9 — Tests, CI, docs, cleanup

1. Fill any unit gaps to keep `bun test --coverage` ≥ 60 % lines on `domain/`, `state/`, `services/analysis`, `main/db`, `main/media`.
2. Playwright: four specs + screenshots; add a WebKit project.
3. `docs/AGENTS.md`: commands, the folder map, the seven data-flow rules (§3), the CSS layer table (§10), the one-DOM player rule, the "one writer for `--accent`" rule, the codec caveat, and the analysis worker notes. `docs/keybindings.md` and `docs/music-analysis.md` rewritten for the new pipeline. `README.md` with screenshots regenerated from Playwright.
4. Remove the L0 probes, confirm `hutch electrobun build --env=stable` succeeds on all three CI runners, tag `v0.2.0`.

---

## Verification (end to end)

1. `bun install && hutch install && hutch electrobun sync && bun run check` — lint (JS+CSS), typecheck, unit tests green.
2. `hutch run dev` — window opens under 300 ms with the static shell; add `tests/fixtures` as a root in Settings; scan shows a live `<progress>`, three rows appear with durations; double-click plays; seeking a FLAC works (range server); the waveform appears within 500 ms; the analysis view shows key/tempo/chords; the accent shifts to the artwork colour; `mod+i` opens the tag editor and a saved title survives a rescan.
3. `bun run test:e2e` — all specs and screenshots pass in Chromium and WebKit.
4. Resize the window below 300 px height — the player collapses to the strip via container query, no JS involved.
5. `hutch electrobun build --env=stable` on macOS produces a DMG under 30 MB.

## Risks and open questions (decisions made, flagged for the user)

- **Electrobun 2 + Bun runtime**: chosen over Cottontail for `bun:sqlite`/`Bun.serve`/`Worker`. L0 verifies; the fallback is Cottontail + `node:sqlite`.
- **React kept** as a thin view layer rather than vanilla DOM or signals — because both repos already use it and the mandated ESLint config ships React rules. Swapping to vanilla later touches only `ui/`.
- **WebKit codec coverage** for Ogg/Opus is the main functional regression versus Electron/Chromium; documented, `bundleCEF` remains an escape hatch.
- **Native context menu is mac/win only** in Electrobun 2; Linux gets the popover fallback.
- **Hand-rolled analysis** will be less accurate than essentia on dense material; the worker is isolated behind `Analysis.version` so the algorithms can be swapped without touching the UI.
- **`content-visibility` instead of a virtualiser** is a bet on WebKit; the measurement in L8 decides.

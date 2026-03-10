# Refactor Plan — Modular Functional Architecture

> Aüeio Player Desktop — v0.2.0

---

## Context

The original frontend was a single 716-line `src/app/index.ts` with:
- Direct state mutation via a single `state` object
- No module boundaries
- No history-based navigation
- Audio engine as loose module-level variables
- All view logic, event handling, and side effects interleaved

This refactor splits the frontend into a clean modular architecture while preserving
all existing functionality and maintaining the design system constraints.

---

## Phase 1 ∷ Tooling & ESLint Setup

**Files:** `package.json`, `eslint.config.mjs`, `.claude/settings.json`

- Install `eslint-plugin-functional` + `eslint-plugin-unicorn`
- Add `lint` / `lint:fix` scripts to `package.json`
- Fix ESLint `files` glob: `'src/*.ts'` → `'src/**/*.ts'` to cover new subdirectories
- Add `functional/prefer-readonly-type`, `functional/no-let`, `functional/immutable-data` rules
- Add selective `unicorn/` rules for modern JS patterns
- Add `.claude/settings.json` PostToolUse hook to auto-run `lint:fix` after file writes

---

## Phase 2 ∷ State Module

**Files:** `src/app/state/types.ts`, `actions.ts`, `reducer.ts`, `index.ts`

Replaces direct mutation of `const state = { ... }` with a typed store:

```
dispatch(action) → reducer(currentState, action) → newState → notify subscribers
```

### Actions

| Action | Payload | Description |
|--------|---------|-------------|
| `TRACKS_LOADED` | `Track[]` | Library scan complete; recomputes filteredTracks |
| `LIBRARY_LOADING` | — | Scan in progress |
| `TRACK_SELECTED` | `number` | Index of selected track; clears waveform |
| `PLAYBACK_STARTED` | — | Audio began playing |
| `PLAYBACK_PAUSED` | — | Audio paused |
| `TIME_UPDATED` | `{currentTime, duration}` | Fired on audio timeupdate |
| `VOLUME_CHANGED` | `number` | User changed volume (0–1) |
| `VIEW_CHANGED` | `ViewName` | Navigation between library/settings |
| `NOW_PLAYING_EXPANDED` | — | Expanded overlay opened |
| `NOW_PLAYING_COLLAPSED` | — | Expanded overlay closed |
| `SETTINGS_UPDATED` | `AppSettings` | Persisted settings loaded/saved |
| `AUDIO_PORT_SET` | `number` | Dynamic audio server port assigned |
| `WAVEFORM_LOADED` | `Float32Array\|null` | Amplitude data ready to render |
| `SEARCH_CHANGED` | `string` | Search query typed; recomputes filteredTracks |
| `DURATION_SET` | `number` | Track duration from metadata |
| `TRACK_DURATION_LOADED` | `{index, duration}` | Individual track duration update |

### Store API

```typescript
const store = createStore(initialState)
store.dispatch({ type: ActionType.VOLUME_CHANGED, payload: 0.8 })
store.getState()     // → PlayerState (readonly)
store.subscribe(fn)  // → cleanup fn
```

---

## Phase 3 ∷ AudioEngine Singleton

**Files:** `src/app/audio/AudioEngine.ts`, `src/app/audio/waveform.ts`

`AudioEngine` is a singleton class — the one justified use of a class in this codebase,
because the Web Audio API requires careful lifecycle management:
- Single `AudioContext` per page (browser restriction)
- `MediaElementAudioSourceNode` can only be created once per `HTMLAudioElement`

```typescript
const engine = AudioEngine.getInstance()
engine.ensureContext()          // lazy-init AudioContext + analyser graph
await engine.play(url)         // set src, seek to 0, play
engine.seek(time)              // change playback position
engine.setVolume(vol)          // set volume (0–1)
engine.onTimeUpdate(cb)        // subscribe, returns cleanup fn
engine.onEnded(cb)             // subscribe, returns cleanup fn
```

`waveform.ts` contains only pure functions:

```typescript
loadWaveformData(url, ctx)                                 // → Float32Array
drawWaveformToCanvas(canvas, waveform, progress, showProg) // → void
```

---

## Phase 4 ∷ Navigation Module

**Files:** `src/app/navigation/index.ts`

Replaces direct DOM class manipulation with `history.pushState`:

```typescript
navigate('settings')          // pushState → #settings
navigate('library', true)     // replaceState → #library (initial load)
navigateNowPlaying(true)      // pushState → #nowplaying

bindPopState(dispatch)        // popstate → dispatch VIEW_CHANGED / NOW_PLAYING_*
getCurrentViewFromURL()       // reads location.hash on load
```

---

## Phase 5 ∷ View Modules

**Files:** `src/app/views/library.ts`, `settings.ts`, `nowPlaying.ts`

Each view module exports:
- `renderX(state)` — pure DOM sync from state, called by subscribe
- `bindXEvents(store, ...)` — registers event listeners once at startup

Side effects (async: RPC calls, audio playback, waveform loading) happen in event
handlers — never in the reducer.

### Track playback flow

```
click .track-item
  → selectAndPlayTrack(idx, store, engine)
    → dispatch(TRACK_SELECTED)
    → engine.play(url)
    → dispatch(PLAYBACK_STARTED)
    → loadWaveformData(url, ctx)
    → dispatch(WAVEFORM_LOADED)
```

---

## Phase 6 ∷ RPC Module + Utils

**Files:** `src/app/rpc/index.ts`, `src/app/utils/dom.ts`, `src/app/utils/audio.ts`,
`src/app/components/trackItem.ts`, `src/app/components/folderItem.ts`

`initRPC(store)` wires Electroview RPC to dispatch actions:
- `libraryUpdated` → `TRACKS_LOADED`
- `settingsSaved` → `SETTINGS_UPDATED`

Utils are pure functions extracted from the original monolith.

---

## Phase 7 ∷ Entry Point

**File:** `src/app/index.ts`

Reduced to ~50 lines:
1. Create store
2. Init RPC
3. Get AudioEngine singleton
4. Bind all events (once)
5. Initial render
6. `init()`: fetch settings + port, scan library

---

## Phase 8 ∷ Playwright Test Coverage

**Files:** `tests/library-populated.spec.ts`, `tests/now-playing.spec.ts`

### library-populated.spec.ts

- Library view active by default
- Search input visible + accepts text
- Track list + count + empty state elements attached
- Search filters and clears
- Now-playing bar hidden with no track
- URL hash updates on navigation
- Browser back/forward navigation works
- Screenshots: `library-populated.png`

### now-playing.spec.ts

- Bar hidden initially
- Expanded view not active initially
- All control buttons attached (`#np-play-btn`, `#np-prev-btn`, etc.)
- Waveform canvases attached
- Expand button opens expanded view
- `#now-playing-view` gets `.active` class
- Back button collapses view
- URL hash becomes `#nowplaying` on expand
- Volume slider accessible
- Screenshots: `now-playing-bar.png`, `now-playing-expanded.png`

---

## Phase 9 ∷ CI/CD

**File:** `.github/workflows/ci-release.yml`

```
push/PR → lint → test → build (macOS + Linux + Windows) → (on tag) release
```

- Release triggered by tags matching `v*`
- Builds all 3 platforms via matrix
- Uploads artifacts to GitHub Release

---

## Phase 10 ∷ Documentation

- `README.md` updated with architecture diagram, module descriptions, commands
- `docs/REFACTOR_PLAN.md` — this document

---

## Key Constraints Preserved

- No jQuery, no React, no component framework
- No Tailwind, no utility-class CSS
- Semantic HTML + CSS layers unchanged
- Data attributes for state (not class names)
- All state changes via `dispatch()` — zero direct mutation in views
- AudioEngine is the only class; everything else is functions/constants

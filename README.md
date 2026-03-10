# Aüeio Player Desktop

A beautiful, minimal cross-platform audio player built with Electrobun + Bun.

---

## Architecture

```
src/
├── app/                    ← Frontend (webview)
│   ├── index.ts            ← Entry point: wires all modules together
│   ├── index.html          ← Semantic HTML, single-page app shell
│   ├── state/              ← Reducer/action state management
│   │   ├── types.ts        ← PlayerState type, initialState
│   │   ├── actions.ts      ← ActionType enum, Action union type
│   │   ├── reducer.ts      ← Pure (state, action) => state reducer
│   │   └── index.ts        ← createStore(), Store type
│   ├── audio/
│   │   ├── AudioEngine.ts  ← Singleton class: Web Audio API lifecycle
│   │   └── waveform.ts     ← Pure: loadWaveformData(), drawWaveformToCanvas()
│   ├── views/
│   │   ├── library.ts      ← Library view render + events + playback side effects
│   │   ├── settings.ts     ← Settings view render + folder management
│   │   └── nowPlaying.ts   ← Now Playing bar + expanded view + audio engine events
│   ├── components/
│   │   ├── trackItem.ts    ← buildTrackItem() → HTMLElement
│   │   └── folderItem.ts   ← buildFolderItem() → HTMLElement
│   ├── navigation/
│   │   └── index.ts        ← History API navigation (navigate, bindPopState)
│   ├── rpc/
│   │   └── index.ts        ← Electroview RPC client initialization
│   ├── utils/
│   │   ├── dom.ts          ← $(), formatTime(), escapeHtml()
│   │   └── audio.ts        ← buildAudioUrl(), getTrackEmoji()
│   └── styles/             ← CSS design system (7 layered files)
└── bun/                    ← Backend (Bun main process)
    ├── index.ts            ← App window, HTTP audio server, RPC handlers
    ├── rpc.ts              ← Shared type contracts
    ├── library.ts          ← Music library file scanner
    └── settings.ts         ← Settings persistence (~/.config)
```

### State Management

All UI state changes go through the store's `dispatch()` function using the reducer/action pattern.
No direct state mutation occurs anywhere in the frontend.

```
UI Event → dispatch(action) → reducer(state, action) → new state → subscribe callbacks → render
```

The `AudioEngine` singleton class manages the Web Audio API lifecycle (the one place a class
is justified — browser context lifecycle management).

### Navigation

View changes push entries to `history.pushState()`. Browser back/forward navigation
dispatches state changes via the `popstate` event.

```
navigate('settings') → history.pushState → URL: #settings
Browser back → popstate → dispatch(VIEW_CHANGED) → render
```

---

## Development

```bash
# Start dev server with hot reload
bun dev

# Run E2E tests (Playwright)
bun test

# Lint (ESLint)
bun run lint

# Auto-fix lint issues
bun run lint:fix

# Production build
bun run build
```

---

## Testing

E2E tests use Playwright + Chromium against a local HTTP server serving the webview:

```
tests/app.spec.ts              ← Core UI: layout, navigation, accessibility
tests/library-populated.spec.ts ← Library view: search, track list, view state
tests/now-playing.spec.ts       ← Now Playing: bar, expand, controls, history API
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | [Electrobun](https://electrobun.dev) |
| Runtime | [Bun](https://bun.sh) |
| Language | TypeScript (strict mode) |
| Frontend | Vanilla DOM + Web Audio API |
| Styling | Semantic HTML + CSS layers (no Tailwind, no jQuery) |
| Tests | Playwright |
| Linting | ESLint + @stylistic + @typescript-eslint + functional + unicorn |
| CI/CD | GitHub Actions |

---

## Design Principles

- Semantic HTML first — no component frameworks
- CSS layers (`tokens → reset → base → states → components → utilities → app`)
- Data attributes for state, not class names
- Functional patterns — reducer/action for state, pure functions for rendering
- No jQuery, no Tailwind, no utility-class frameworks
- See `docs/DESIGN_GUIDE.md` and `docs/STYLE_GUIDE.md` for full details

---

## Release

Push a version tag to trigger a release build:

```bash
git tag v0.2.0
git push origin v0.2.0
```

GitHub Actions will build binaries for macOS, Linux, and Windows and publish a GitHub Release.

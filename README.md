# aüeio player

A lightweight desktop music player: library scanning, now playing with a
chord/key/tempo analysis view, a slim DSP page, playlists, and tag editing.

Built on [Electrobun 2](https://electrobun.dev) (Bun main process, system
WebKit webview) and React 19 — a from-scratch, deliberately smaller rebuild
of `desktop-audio`. See
[`docs/plans/desktop-audio-migration.md`](./docs/plans/desktop-audio-migration.md)
for the full spec and the reasoning behind every cut feature.

Bun only — never npm, yarn, or pnpm.

## Getting started

```bash
bun install
bun run dev
```

## Checks

```bash
bun run check     # lint + typecheck + unit tests
bun run test:e2e  # playwright
```

## Building

```bash
bun run build          # dev build
bun run build:stable   # production build
```

See the migration plan for the architecture: unidirectional state, DTOs in
`src/shared`/`src/app/domain`, the RPC contract, and the CSS layer rules.

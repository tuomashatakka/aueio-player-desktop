# CSS architecture

`src/app/styles/` is plain CSS, copied verbatim into the build
(`electrobun.config.ts`'s `build.copy`) — no Vite, no PostCSS, no Tailwind,
no CSS-in-JS. It targets one runtime, system WebKit (`@layer`, nesting,
`:has()`, container queries, `@property`, `light-dark()`, `content-visibility`
all ship there), so the CSS uses those features directly instead of
transpiling around them. `@tuomashatakka/eslint-config`'s `@eslint/css` rules
lint every file as part of `bun run lint`.

## Layers

`main.css` declares the order once and `@import`s each file once, in the
same order — `tests/unit/styles/contract.test.ts` checks both facts stay in
sync:

```css
@layer fonts, tokens, base, components, layout, views, states, utilities;

@import './fonts.css';
@import './tokens.css';
/* … one @import per layer, same order … */
```

Each file wraps its rules in `@layer <name> { … }` matching its own
filename. The order is load-bearing: a component's base rule in
`components` is beaten by a structural override in `layout` or a
screen-specific rule in `views` without needing to out-specify anything,
because later layers always win over earlier ones regardless of selector
specificity.

| File | Layer | Contract |
|---|---|---|
| `fonts.css` | fonts | `@font-face` only |
| `tokens.css` | tokens | every custom property, `@property`, `:root`, `[data-theme]` — the **only** file allowed to declare any of these |
| `base.css` | base | element selectors only, extending browser defaults (`button`, `input`, `dialog`, `table`, `menu`, `kbd`, …); the only reset is `box-sizing: border-box` and block-level media |
| `components.css` | components | named, reusable things, one root selector per component (`.button`, `.waveform`, `.cover`, `.eq-fader`, `.chord-lane`, `.frequency-matrix`, `.menu`) |
| `layout.css` | layout | structure only — the shell grid, titlebar, sidebar, and every `@container shell (...)` block |
| `views.css` | views | one top-level root per screen — `main[data-view='library']`, `main[data-view='settings']`, `dialog.tag-editor`, `section.player`, `section.dsp` (`contract.test.ts` enforces every top-level selector starts with one of these) |
| `states.css` | states | cross-cutting attribute states: `[aria-busy]`, `[data-loading]`, `[aria-pressed]`, `[data-selected]`, `:focus-visible`, reduced motion |
| `utilities.css` | utilities | `.sr-only`, `.fade-y`, `.truncate` — nothing else |

## Module roots

Every top-level rule in `components.css` and `views.css` nests under a
single root selector for that module — a component's own class, or a
`data-view`/element selector for a screen — rather than a flat list of
loosely related rules. `views.css`'s allowed roots are enumerated in the
contract test above; adding a new screen means adding its root there too.

## Tokens

`tokens.css` is the **one token contract**: every custom property
(`--surface`, `--ink`, `--spacing-*`, `--font-size-*`, `--titlebar-h`,
`--player-bar-h`, `--sidebar-w`, …) and every theme-dependent selector
(`:root`, `[data-theme='dark'|'light']`) lives there and only there.
`--accent`, `--accent-contrast` and the `--art-vibrant`/`-muted`/`-dark`/
`-light`/`-lum` tokens are registered with `@property` (typed `<color>`/
`<number>`, `inherits: true`), which is what lets the whole page cross-fade
between tracks with a plain `transition` instead of animation code — an
unregistered custom property can only be swapped instantly. `--accent` and
`--accent-contrast` are written at runtime by `effects/appearance.ts` (see
AGENTS.md's "One Writer for `--accent`"); nothing else touches them.

## Container queries replace JS tiers

`.shell` is `container-type: size; container-name: shell` (`layout.css`).
Two `@container shell` blocks replace what used to be a `data-height-tier`
attribute written from JS:

- `@container shell (max-block-size: 18.75rem)` collapses the shell to just
  the player strip — sidebar and main are `display: none`, the grid becomes
  a single `player` row.
- `@container shell (max-inline-size: 40rem)` turns the sidebar into a fixed
  overlay instead of a grid column.

Both blocks are written top-level (not nested inside `.shell { … }`) because
this project's `@eslint/css` linter (css-tree 4.1.1) doesn't forward
`allowNestedRules` into `@container`'s block parser the way it does for
`@media` — a `.shell`-prefixed selector at the top level is identical CSS to
every browser, just not to this linter.

## `content-visibility` instead of a virtualiser

Table rows get `content-visibility: auto; contain-intrinsic-block-size: auto
var(--row-h)` (`base.css`) instead of a JS virtualisation library — WebKit
skips layout/paint work for off-screen rows on its own. `--tanstack/virtual-core`
is scoped in the migration plan only as a fallback if a real 20k-row
measurement shows WebKit stuttering past that; it is not currently a
dependency.

## Conventions

- Native CSS nesting, never BEM (`.button { &.primary { … } }`, not
  `.button--primary`).
- State lives in attributes the component already sets —
  `[data-open]`, `[aria-pressed]`, `[data-mode]`, `[data-selected]` — never a
  toggled class.
- Logical properties only (`inline-size`, `padding-block`, `inset-inline-start`),
  never `width`/`top`/`left` physical properties.
- `rem` for font sizes (`contract.test.ts` rejects `font-size` in `px`);
  `no-important` is a lint error, not a convention.
- Role tokens (`--surface`, `--ink`, `--line`, …) are defined once with
  `light-dark()` under `:root { color-scheme: light dark }`, and
  `[data-theme='dark'|'light']` pins `color-scheme` to force one branch.
  `effects/appearance.ts` (the one writer of `data-theme`) resolves
  `theme: 'auto'` to `'dark'`/`'light'` itself via `matchMedia` and always
  writes the attribute — there is no CSS-only "auto" state left unresolved
  on `documentElement`, `light-dark()` is what makes each branch a one-line
  token declaration rather than a duplicated block.

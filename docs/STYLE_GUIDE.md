# Universal Design System

A minimal, dark-first design system. Framework-agnostic, semantic HTML-driven.

---

## Core Philosophy

1. **Semantic HTML first** — Style elements, not classes
2. **Data attributes for variants** — `data-variant`, `data-size`, `data-state`
3. **CSS layers for cascade** — Predictable specificity
4. **Minimal footprint** — No dependencies, no build tools required
5. **Accessibility built-in** — Focus states, ARIA support, reduced motion

---

## Quick Start

```html
<!-- Single import -->
<link rel="stylesheet" href="main.css">

<!-- Or inline in <style> tag -->
```

```html
<!-- Just write semantic HTML -->
<button data-variant="primary">Save</button>
<input type="email" placeholder="you@example.com">
<span data-badge data-variant="success">Active</span>
```

---

## Architecture

### CSS Layer Order

```css
@layer tokens, reset, base, states, components, utilities;
```

| Layer | Purpose |
|-------|---------|
| `tokens` | CSS custom properties |
| `reset` | Normalize defaults |
| `base` | Element styles (button, input, h1, etc.) |
| `states` | Success, warning, error, info, loading |
| `components` | Badge, Card, Alert, etc. |
| `utilities` | Layout helpers, visibility |

### File Structure

```
css/
├── main.css        # Entry point
├── tokens.css      # Design tokens
├── reset.css       # CSS reset
├── base.css        # Element defaults
├── states.css      # State mixins
├── components.css  # Components
└── utilities.css   # Helpers
```

---

## Design Tokens

### Colors

```css
/* Backgrounds */
--bg: #121212;
--bg-raised: #1a1a1a;
--bg-input: #2a2a2a;
--bg-hover: #333333;

/* Accents */
--accent: #ff5500;
--accent-hover: #ff7733;
--accent-muted: rgba(255, 85, 0, 0.15);
--accent-alt: #3a86ff;

/* Semantic */
--success: #38b000;
--warning: #ffbe0b;
--danger: #ff006e;
--info: #3a86ff;

/* Text */
--text: #ffffff;
--text-dim: #cccccc;
--text-muted: #888888;

/* Borders */
--border: rgba(255, 255, 255, 0.1);
--border-hover: rgba(255, 255, 255, 0.2);
--border-focus: var(--accent);
```

### Typography

```css
/* Fonts */
--font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
--font-mono: "SF Mono", Monaco, "Cascadia Code", monospace;

/* Sizes */
--text-xs: 10px;
--text-sm: 12px;
--text-base: 14px;
--text-lg: 16px;
--text-xl: 20px;
--text-2xl: 24px;
--text-3xl: 32px;

/* Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Spacing

```css
/* Base: 4px */
--sp-1: 4px;
--sp-2: 8px;
--sp-3: 12px;
--sp-4: 16px;
--sp-6: 24px;
--sp-8: 32px;
--sp-12: 48px;
```

### Effects

```css
/* Radius */
--radius-sm: 2px;
--radius: 4px;
--radius-lg: 8px;
--radius-full: 9999px;

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.2);
--shadow: 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.3);
--shadow-lg: 0 8px 16px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.3);

/* Transitions */
--ease: cubic-bezier(0.4, 0, 0.2, 1);
--duration-fast: 100ms;
--duration: 200ms;
--duration-slow: 300ms;
```

---

## Components

### Buttons

```html
<!-- Variants -->
<button>Default</button>
<button data-variant="primary">Primary</button>
<button data-variant="danger">Danger</button>
<button data-variant="ghost">Ghost</button>
<button data-variant="outline">Outline</button>

<!-- Sizes -->
<button data-size="sm">Small</button>
<button data-size="lg">Large</button>

<!-- States -->
<button disabled>Disabled</button>
<button data-loading>Loading</button>

<!-- Icon button -->
<button data-icon>★</button>
```

### Inputs

```html
<!-- Text -->
<label>
  <span>Email</span>
  <input type="email" placeholder="you@example.com">
</label>

<!-- With validation -->
<label data-state="error">
  <span>Password</span>
  <input type="password" aria-invalid="true">
  <small>Must be 8+ characters</small>
</label>

<!-- Select -->
<label>
  <span>Country</span>
  <select>
    <option>Select...</option>
  </select>
</label>

<!-- Checkbox / Radio -->
<label><input type="checkbox"> Remember me</label>
<label><input type="radio" name="plan"> Basic</label>

<!-- Input group -->
<div data-input-group>
  <span data-prefix>$</span>
  <input type="number">
  <span data-suffix>.00</span>
</div>
```

### Badges

```html
<span data-badge>Default</span>
<span data-badge data-variant="primary">Primary</span>
<span data-badge data-variant="success">Success</span>
<span data-badge data-variant="warning">Warning</span>
<span data-badge data-variant="danger">Danger</span>
<span data-badge data-variant="info">Info</span>

<!-- With dot -->
<span data-badge data-dot data-variant="success">Online</span>

<!-- Sizes -->
<span data-badge data-size="sm">Small</span>
<span data-badge data-size="lg">Large</span>
```

### Cards

```html
<!-- Basic -->
<article data-card>
  <header>Title</header>
  <p>Content goes here.</p>
</article>

<!-- Variants -->
<article data-card data-variant="outlined">...</article>
<article data-card data-variant="elevated">...</article>

<!-- Interactive -->
<article data-card data-interactive>
  Clickable card
</article>

<!-- With footer -->
<article data-card>
  <header>Title</header>
  <p>Content</p>
  <footer>
    <button data-variant="ghost">Cancel</button>
    <button data-variant="primary">Save</button>
  </footer>
</article>
```

### Alerts

```html
<aside data-alert>
  <strong>Info</strong>
  Informational message.
</aside>

<aside data-alert data-variant="success">
  <strong>Success!</strong>
  Operation completed.
</aside>

<aside data-alert data-variant="warning">
  <strong>Warning</strong>
  Please review.
</aside>

<aside data-alert data-variant="danger">
  <strong>Error</strong>
  Something went wrong.
</aside>
```

### More Components

```html
<!-- Chip/Tag -->
<span data-chip>
  Tag <button>×</button>
</span>

<!-- Avatar -->
<span data-avatar>JD</span>
<span data-avatar data-size="sm">A</span>
<span data-avatar data-size="lg">XL</span>

<!-- Skeleton -->
<div data-skeleton></div>

<!-- Tooltip -->
<span data-tooltip="Helpful info">Hover me</span>
```

---

## State Mixins

Apply states using `data-state` or `data-variant`:

```html
<!-- On containers -->
<label data-state="error">
  <span>Field</span>
  <input type="text">
  <small>Error message</small>
</label>

<article data-card data-state="success">
  Success state card
</article>

<!-- On inputs directly -->
<input data-state="warning">
<input aria-invalid="true">  <!-- Also triggers error state -->

<!-- Loading state -->
<button data-loading>Processing</button>
<div data-loading>Loading content...</div>
```

### Available States

| Attribute | Effect |
|-----------|--------|
| `data-state="success"` | Green border/background |
| `data-state="warning"` | Yellow border/background |
| `data-state="error"` | Red border/background |
| `data-state="info"` | Blue border/background |
| `data-loading` | Spinner overlay, disabled |
| `disabled` | Opacity 0.5, no interaction |

---

## Layout Utilities

```html
<!-- Vertical stack -->
<div data-stack>
  <p>Item 1</p>
  <p>Item 2</p>
</div>
<div data-stack="sm">Tight spacing</div>
<div data-stack="lg">Loose spacing</div>

<!-- Horizontal cluster -->
<div data-cluster>
  <button>A</button>
  <button>B</button>
</div>

<!-- Auto grid -->
<div data-grid>
  <article data-card>1</article>
  <article data-card>2</article>
  <article data-card>3</article>
</div>

<!-- Visibility -->
<div hidden>Hidden</div>
<div data-hidden>Also hidden</div>
```

---

## Typography

All heading and text elements are styled by default:

```html
<h1>Page Title (32px)</h1>
<h2>Section Title (24px)</h2>
<h3>Subsection (20px)</h3>
<h4>Component Title (16px)</h4>
<h5>LABEL STYLE (14px, uppercase)</h5>

<p>Body text with <strong>bold</strong> and <em>italic</em>.</p>
<p><small>Muted caption text</small></p>
<p><a href="#">Hyperlink</a></p>
<p><code>inline code</code></p>
<p>Press <kbd>Ctrl</kbd> + <kbd>S</kbd></p>

<pre><code>Code block</code></pre>

<blockquote>
  Quote text
  <cite>Author</cite>
</blockquote>
```

---

## Framework Integration

### Vanilla JS

```html
<button id="submit" data-variant="primary">Submit</button>
<script>
  document.getElementById('submit').addEventListener('click', () => {
    this.setAttribute('data-loading', '')
  })
</script>
```

### React

```tsx
interface ButtonProps {
  variant?: 'primary' | 'danger' | 'ghost'
  size?: 'sm' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

function Button({ variant, size, loading, children, ...props }: ButtonProps) {
  return (
    <button
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      {...props}
    >
      {children}
    </button>
  )
}
```

### Vue

```vue
<template>
  <button
    :data-variant="variant"
    :data-size="size"
    :data-loading="loading || undefined"
  >
    <slot />
  </button>
</template>

<script setup>
defineProps({
  variant: String,
  size: String,
  loading: Boolean
})
</script>
```

### Svelte

```svelte
<script>
  export let variant = undefined
  export let size = undefined
  export let loading = false
</script>

<button
  data-variant={variant}
  data-size={size}
  data-loading={loading || undefined}
  {...$$restProps}
>
  <slot />
</button>
```

---

## Accessibility

- **Focus visible** — Clear outline on keyboard navigation
- **Reduced motion** — Respects `prefers-reduced-motion`
- **ARIA support** — `aria-invalid`, `aria-disabled` trigger states
- **Semantic HTML** — Proper element usage throughout
- **Color contrast** — WCAG AA compliant

---

## Browser Support

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+

Requires support for:
- CSS Custom Properties
- CSS Nesting
- `@layer`
- `:has()`, `:where()`

---

## Customization

Override tokens in your own CSS:

```css
:root {
  --accent: #6366f1;  /* Change primary color */
  --bg: #0a0a0a;      /* Darker background */
  --radius: 8px;      /* Rounder corners */
}
```

---

That's it! Semantic HTML + data attributes = minimal, maintainable styles ♪(´▽｀)
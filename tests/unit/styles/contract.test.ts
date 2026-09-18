import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'


const STYLES_DIR = join(import.meta.dir, '../../../src/app/styles')

const FILES = [
  'fonts.css',
  'tokens.css',
  'base.css',
  'components.css',
  'layout.css',
  'views.css',
  'states.css',
  'utilities.css',
]

const ALL_FILES = [ ...FILES, 'main.css' ]

const contents = Object.fromEntries(
  ALL_FILES.map(file => [ file, readFileSync(join(STYLES_DIR, file), 'utf8') ]),
) as Record<string, string>

function contentOf (file: string): string {
  const value = contents[file]
  if (value === undefined)
    throw new Error(`no fixture content read for ${file}`)

  return value
}


describe('One Token Contract', () => {
  test('tokens.css is the only file with :root / [data-theme] / @property', () => {
    for (const file of FILES) {
      if (file === 'tokens.css')
        continue

      expect(contentOf(file), `${file} must not declare :root`).not.toMatch(/:root\b/)
      expect(contentOf(file), `${file} must not declare [data-theme...]`).not.toMatch(/\[data-theme/)
      expect(contentOf(file), `${file} must not use @property`).not.toMatch(/@property\b/)
    }
  })

  test('tokens.css does declare :root and custom properties', () => {
    expect(contentOf('tokens.css')).toMatch(/:root\s*\{/)
    expect(contentOf('tokens.css')).toMatch(/--[a-z][a-z0-9-]*\s*:/)
  })
})


describe('main.css layer order', () => {
  const main = contentOf('main.css')

  test('@layer order matches @import order, and each import has no leading path segments', () => {
    const layerLine = main.match(/@layer\s+([^;]+);/)
    expect(layerLine).not.toBeNull()

    const layerNames = (layerLine?.[1] ?? '').split(',').map(name => name.trim())

    const importNames = [ ...main.matchAll(/@import\s+'\.\/([a-z]+)\.css';/g) ]
      .map(match => match[1])

    expect(importNames).toEqual(layerNames)
  })

  test('each imported file declares an @layer matching its own filename', () => {
    const layerLine  = main.match(/@layer\s+([^;]+);/)
    const layerNames = (layerLine?.[1] ?? '').split(',').map(name => name.trim())

    for (const name of layerNames) {
      const file = `${name}.css`
      expect(FILES).toContain(file)
      expect(contentOf(file), `${file} must declare @layer ${name}`).toMatch(new RegExp(`@layer\\s+${name}\\s*\\{`))
    }
  })
})


describe('no !important', () => {
  test.each(FILES)('%s has no !important', file => {
    expect(contentOf(file)).not.toMatch(/!important/)
  })
})


describe('no px font sizes', () => {
  test.each(FILES)('%s has no font-size in px', file => {
    expect(contentOf(file)).not.toMatch(/font-size\s*:\s*[0-9.]+px/)
  })
})


describe('views.css top-level roots', () => {
  const ALLOWED_ROOTS = [
    `main[data-view='library']`,
    `main[data-view='settings']`,
    'dialog.tag-editor',
    'section.player',
    'section.dsp',
  ]

  test('every top-level rule begins with an allowed module root', () => {
    const views = contentOf('views.css')
    const lines = views.split('\n')

    const topLevelSelectors: string[] = []

    for (const line of lines) {
      // A top-level rule inside `@layer views { … }` is indented exactly two
      // spaces (lint-enforced 2-space nesting), ends its selector line with
      // '{', and isn't an at-rule (@layer itself, or a future @media/@container).
      const match = line.match(/^ {2}([^\s{][^{]*)\{\s*$/)
      if (match?.[1] !== undefined && !match[1].trim().startsWith('@'))
        topLevelSelectors.push(match[1].trim())
    }

    expect(topLevelSelectors.length).toBeGreaterThan(0)

    for (const selector of topLevelSelectors) {
      const allowed = ALLOWED_ROOTS.some(root => selector.startsWith(root))
      expect(allowed, `"${selector}" does not start with an allowed root (${ALLOWED_ROOTS.join(', ')})`).toBe(true)
    }
  })
})

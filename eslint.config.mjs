import config from '@tuomashatakka/eslint-config'
import globals from 'globals'
import { defineConfig } from 'eslint/config'
import importPlugin from 'eslint-plugin-import-x'


export default defineConfig([
  ...config,
  {
    files:           [ 'src/main/**' ],
    languageOptions: { globals: globals.node },
  },
  {
    files:           [ 'src/app/**', 'tests/**' ],
    languageOptions: { globals: globals.browser },
  },
  { ignores: [ '.hutch/**', 'build/**', 'artifacts/**', 'node_modules/**' ]},
  {
    files:   [ 'src/**' ],
    // `@tuomashatakka/eslint-config` registers eslint-plugin-import-x under
    // the key `import` in its own config object, but flat config does not
    // carry a plugin registration into an object that doesn't declare it —
    // so this object needs its own `plugins` entry to use the rule below.
    plugins: { import: importPlugin },
    rules:   {
      'import/no-restricted-paths': [ 'error', {
        zones: [
          { target: './src/shared', from: './src/app' },
          { target: './src/shared', from: './src/main' },
          { target: './src/app/domain', from: [ './src/app/ui', './src/app/state', './src/app/services', './src/app/effects', './src/main' ]},
          { target: './src/app/state', from: [ './src/app/ui', './src/app/services', './src/app/effects' ]},
          { target: './src/app/ui', from: [ './src/app/services', './src/app/effects' ]},
          { target: './src/app', from: './src/main' },
          { target: './src/main', from: './src/app' },
        ],
      }],
    },
  },
])

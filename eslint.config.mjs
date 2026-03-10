import stylistic from '@stylistic/eslint-plugin'
import tsplugin from '@typescript-eslint/eslint-plugin'
import importPlugin from 'eslint-plugin-import'
import functionalPlugin from 'eslint-plugin-functional'
import unicornPlugin from 'eslint-plugin-unicorn'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import omitPlugin from 'eslint-plugin-omit-unnecessary'


const plugins = {
  'import':             importPlugin,
  '@stylistic':         stylistic,
  '@typescript-eslint': tsplugin,
  'omit':               omitPlugin,
  'functional':         functionalPlugin,
  'unicorn':            unicornPlugin,
}

const config = {
  files:           [ 'src/**/*.{js,jsx,mjs,cjs,ts,tsx}' ],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType:  'module',
    globals:     {
      ...globals.node,
    },
  },
  ignores: [ '**/node_modules/**' ],
  plugins,

  rules: {
    'multiline-comment-style': [
      'warn',
      'separate-lines',
      { checkJSDoc: false },
    ],
    '@stylistic/lines-around-comment': [
      'warn',
      {
        beforeBlockComment: true,
        beforeLineComment:  false,
        afterLineComment:   false,
        allowClassEnd:      true,
        allowBlockEnd:      true,
      },
    ],

    // TODO
    'import/no-extraneous-dependencies':      [ 'warn' ],
    'import/consistent-type-specifier-style': [ 'warn', 'prefer-top-level' ],
    'import/newline-after-import':            [ 'warn', { count: 2 }],
    'import/no-unassigned-import':            [
      'error',
      { allow: [ '**/*.{le,c,sc,sa}ss', 'server-only' ]},
    ],
    'import/prefer-default-export': [ 'off' ],
    'import/no-mutable-exports':    [ 'error' ],
    'import/order':                 [
      'off',
      {
        'groups': [
          'builtin',
          'type',
          'external',
          [ 'parent', 'sibling', 'index' ],
          [ 'internal', 'object' ],
        ],
        'alphabetize':             { order: 'asc', caseInsensitive: true },
        'distinctGroup':           true,
        'warnOnUnassignedImports': true,
        'newlines-between':        'always',
        'pathGroups':              [{ group: 'internal', pattern: '**/*.s?css' }],
      },
    ],

    // Typescript
    '@stylistic/ban-ts-comment': [ 'off', 'allow-single-line' ],

    // Enforced practices (enforce functional and orthogonal code)
    'complexity':       [ 'warn', { max: 14 }],
    'eqeqeq':           [ 'warn', 'smart' ],
    'arrow-body-style': [ 'warn', 'as-needed' ],
    'max-lines':        [
      'warn',
      { max: 666, skipComments: true, skipBlankLines: true },
    ],
    'max-statements':       [ 'warn', 40 ],
    'max-depth':            [ 'warn', 6 ],
    'no-console':           [ 0 ],
    'no-debugger':          [ 'warn' ],
    'dot-notation':         [ 'warn' ],
    'no-undef':             [ 0 ],
    'use-isnan':            [ 'error' ],
    'no-obj-calls':         [ 'error' ],
    'no-new-symbol':        [ 'error' ],
    'no-func-assign':       [ 'error' ],
    'no-class-assign':      [ 'error' ],
    'no-array-constructor': [ 'error' ],

    'omit/omit-unnecessary-parens-brackets': [ 'warn' ],

    // Stylistic formatting opinionations
    // '@stylistic/function-paren-newline':           [ 'warn', 'always' ],
    '@stylistic/function-call-spacing':     [ 'warn', 'never' ],
    '@stylistic/computed-property-spacing': [ 'warn', 'never' ],
    '@stylistic/implicit-arrow-linebreak':  [ 'warn', 'below' ],
    '@stylistic/brace-style':               [ 'warn', 'stroustrup', { allowSingleLine: false }],
    '@stylistic/comma-dangle':              [ 'warn', 'only-multiline' ],
    '@stylistic/comma-spacing':             [ 'warn', { before: false, after: true }],
    '@stylistic/comma-style':               [ 'warn', 'last' ],
    '@stylistic/key-spacing':               [
      'warn',
      { beforeColon: false, afterColon: true, align: 'value' },
    ],
    '@stylistic/keyword-spacing':         [ 'warn', { before: true, after: true }],
    '@stylistic/object-property-newline': [
      'warn',
      {
        allowAllPropertiesOnSameLine: true,
      },
    ],
    '@stylistic/max-len':                   [ 0, 400 ],
    '@stylistic/no-tabs':                   [ 'warn' ],
    '@stylistic/no-extra-parens':           [ 'warn', 'all' ],
    '@stylistic/jsx-function-call-newline': [ 'warn', 'always' ],
    '@stylistic/no-multiple-empty-lines':   [
      'warn',
      { max: 2, maxEOF: 0, maxBOF: 0 },
    ],
    '@stylistic/no-trailing-spaces': [
      'warn',
      { skipBlankLines: false, ignoreComments: false },
    ],
    '@stylistic/no-confusing-arrow':            [ 0 ],
    '@stylistic/no-whitespace-before-property': [ 'warn' ],
    '@stylistic/space-in-parens':               [ 'warn', 'never' ],
    '@stylistic/space-infix-ops':               [ 'warn', { int32Hint: false }],
    '@stylistic/space-unary-ops':               [ 'warn', { words: true, nonwords: false }],
    '@stylistic/switch-colon-spacing':          [ 'warn', { after: true, before: false }],
    '@stylistic/template-curly-spacing':        [ 'warn', 'never' ],
    '@stylistic/wrap-iife':                     [ 'warn', 'inside' ],
    '@stylistic/wrap-regex':                    [ 'warn' ],
    '@stylistic/object-curly-spacing':          [
      'warn',
      'always',
      { arraysInObjects: false, objectsInObjects: false },
    ],
    '@stylistic/array-bracket-spacing': [
      'warn',
      'always',
      { arraysInArrays: false, objectsInArrays: false },
    ],
    '@stylistic/new-parens':         [ 'warn', 'always' ],
    '@stylistic/operator-linebreak': [
      'warn',
      'after',
      { overrides: { '?': 'before', ':': 'before' }},
    ],
    '@stylistic/quote-props': [
      'warn',
      'consistent-as-needed',
      { keywords: false, unnecessary: true, numbers: false },
    ],
    '@stylistic/indent': [
      'warn',
      2,
      { SwitchCase: 1, CallExpression: { arguments: 'first' }},
    ],
    '@stylistic/arrow-spacing':            [ 'warn' ],
    '@stylistic/newline-per-chained-call': [
      'warn',
      { ignoreChainWithDepth: 2 },
    ],
    '@stylistic/lines-between-class-members': [
      'warn',
      'always',
      { exceptAfterSingleLine: true },
    ],
    '@stylistic/one-var-declaration-per-line': [ 'warn', 'always' ],

    // @stylistic
    '@stylistic/arrow-parens':                [ 'warn', 'as-needed' ],
    '@stylistic/dot-location':                [ 'warn', 'property' ],
    '@stylistic/eol-last':                    [ 'warn', 'always' ],
    '@stylistic/multiline-ternary':           [ 'warn', 'always-multiline' ],
    '@stylistic/no-floating-decimal':         [ 'warn' ],
    '@stylistic/no-mixed-operators':          [ 'warn' ],
    '@stylistic/no-extra-semi':               [ 'warn' ],
    '@stylistic/semi-spacing':                [ 'warn', { before: false, after: true }],
    '@stylistic/semi-style':                  [ 'warn', 'last' ],
    '@stylistic/semi':                        [ 'warn', 'never' ],
    '@stylistic/space-before-function-paren': [
      'warn',
      { anonymous: 'always', named: 'always', asyncArrow: 'always' },
    ],
    '@stylistic/template-tag-spacing': [ 'warn', 'always' ],
    '@stylistic/yield-star-spacing':   [ 'warn', 'after' ],
    '@stylistic/quotes':               [
      'warn',
      'single',
      { avoidEscape: true },
    ],

    // JSX/React
    '@stylistic/jsx-quotes':  [ 'warn', 'prefer-single' ],
    '@stylistic/jsx-newline': [
      'warn',
      { prevent: true, allowMultilines: true },
    ],
    '@stylistic/no-multi-spaces':             [ 'warn' ],
    '@stylistic/jsx-equals-spacing':          [ 'warn', 'never' ],
    '@stylistic/jsx-max-props-per-line':      [ 'warn', { maximum: 1, when: 'multiline' }],
    '@stylistic/jsx-self-closing-comp':       [ 'warn', { component: true, html: true }],
    '@stylistic/jsx-one-expression-per-line': [ 'warn', { allow: 'single-child' }],
    '@stylistic/jsx-tag-spacing':             [
      'warn',
      {
        closingSlash:      'never',
        beforeSelfClosing: 'always',
        beforeClosing:     'never',
        afterOpening:      'never',
      },
    ],
    // 'react/no-unescaped-entities':     [ 'error', { forbid: [ '>', '}' ]}],
    // 'react/jsx-uses-vars':             [ 'error' ],
    // 'react/jsx-uses-react':            [ 'error' ],
    // 'react/style-prop-object':         [ 'error', { allow: []}],
    // 'react/prefer-stateless-function': [
    //   'error',
    //   { ignorePureComponents: false },
    // ],
    // 'react/no-invalid-html-attribute':         [ 'error', []],
    // 'react/hook-use-state':                    [ 'warn', { allowDestructuredState: true }],
    // 'react/jsx-one-expression-per-line':       [ 'warn', { allow: 'single-child' }],
    // 'react/jsx-no-useless-fragment':           [ 'warn', { allowExpressions: true }],
    // 'react/jsx-no-target-blank':               [ 'warn', { enforceDynamicLinks: 'always' }],
    // 'react/jsx-closing-bracket-location':      [ 'warn', 'after-props' ],
    // 'react/jsx-closing-tag-location':          [ 'warn', 'line-aligned' ],
    // 'react/jsx-equals-spacing':                [ 'warn', 'never' ],
    // 'react/jsx-first-prop-new-line':           [ 'warn', 'multiline' ],
    // 'react/jsx-max-props-per-line':            [ 'warn', { maximum: 1, when: 'multiline' }],
    // 'react/jsx-no-constructed-context-values': [ 'warn' ],
    // 'react/jsx-no-script-url':                 [ 'warn' ],
    // 'react/jsx-no-comment-textnodes':          [ 'warn' ],
    // 'react/jsx-no-duplicate-props':            [ 'warn' ],
    // 'react/jsx-no-undef':                      [ 'warn' ],
    // 'react/jsx-pascal-case':                   [ 'warn' ],
    // 'react/jsx-curly-brace-presence':          [
    //   'warn',
    //   { props: 'never', children: 'never' },
    // ],
    // 'react/jsx-curly-spacing': [ 'warn', { when: 'always', spacing: { objectLiterals: 'never' }}],
    // 'react/display-name':      [ 'warn', { checkContextObjects: true }],

    // 'react-hooks/exhaustive-deps': 0,

    '@stylistic/jsx-indent-props': [
      'warn',
      { indentMode: 2, ignoreTernaryOperator: true },
    ],
    '@stylistic/indent': [
      'warn',
      2,
      { offsetTernaryExpressions: false, flatTernaryExpressions: true },
    ],

    // Block padding
    '@stylistic/no-multi-spaces': [
      'warn',
      {
        exceptions: {
          Property:           true,
          TSTypeAnnotation:   true,
          VariableDeclarator: true,
          ObjectExpression:   false,
        },
      },
    ],
    '@stylistic/spaced-comment':                   [ 'warn', 'always', { markers: [ '/' ]}],
    '@stylistic/padded-blocks':                    [ 'warn', 'never' ],
    '@stylistic/nonblock-statement-body-position': [ 'warn', 'below' ],
    '@stylistic/space-before-blocks':              [ 'warn', 'always' ],

    '@typescript-eslint/no-implicit-any': 0,

    'no-unused-vars':                    0,
    '@typescript-eslint/no-unused-vars': 0,
    '@stylistic/no-mixed-operators':     0,

    // Functional programming rules (prefer immutability, no mutation)
    'functional/prefer-readonly-type':          [ 'warn', { allowMutableReturnType: true }],
    'functional/no-let':                        [ 'warn', { allowInForLoopInit: true }],
    'functional/immutable-data':                [ 'warn', { ignoreIdentifierPattern: [ '^audioEl', '^el' ]}],
    'functional/no-loop-statements':            [ 'off' ],
    'functional/no-conditional-statements':     [ 'off' ],
    'functional/no-expression-statements':      [ 'off' ],
    'functional/no-return-void':                [ 'off' ],
    'functional/no-classes':                    [ 'off' ],
    'functional/no-throw-statements':           [ 'off' ],

    // Unicorn rules (modern JS best practices, selective)
    'unicorn/prefer-query-selector':            [ 'warn' ],
    'unicorn/prefer-dom-node-append':           [ 'warn' ],
    'unicorn/no-array-for-each':                [ 'warn' ],
    'unicorn/prefer-includes':                  [ 'warn' ],
    'unicorn/no-for-loop':                      [ 'warn' ],
    'unicorn/prefer-string-slice':              [ 'warn' ],
    'unicorn/no-negated-condition':             [ 'warn' ],
    'unicorn/no-useless-undefined':             [ 'warn' ],
    'unicorn/prefer-number-properties':         [ 'warn' ],
    'unicorn/prefer-optional-catch-binding':    [ 'warn' ],

    '@stylistic/padding-line-between-statements': [
      'warn',
      { blankLine: 'always', prev: 'directive', next: '*' },
      { blankLine: 'any', prev: 'directive', next: 'directive' },

      { blankLine: 'always', next: [ 'const', 'let', 'var' ], prev: '*' },
      { blankLine: 'any', prev: [ 'const', 'let', 'var' ], next: '*' },
      {
        blankLine: 'any',
        prev:      [ 'const', 'let', 'var' ],
        next:      [ 'const', 'let', 'var' ],
      },

      { prev: 'import', next: '*', blankLine: 'always' },
      { prev: 'import', next: 'import', blankLine: 'any' },

      { blankLine: 'always', prev: '*', next: [ 'export' ]},

      { blankLine: 'never', prev: 'case', next: '*' },
      { blankLine: 'never', prev: 'default', next: '*' },

      {
        blankLine: 'always',
        prev:      [ 'block-like', 'block' ],
        next:      [ 'multiline-expression', 'function', 'block-like', 'block' ],
      },
      {
        blankLine: 'any',
        prev:      [ 'multiline-expression', 'function', 'block-like', 'block' ],
        next:      [ 'multiline-expression', 'function', 'block-like', 'block' ],
      },
    ],
  },
  files:           [ 'src/**/*.{js,jsx,mjs,cjs,ts,tsx}' ],
  languageOptions: {
    ecmaVersion:   'latest',
    sourceType:    'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
    globals: {
      ...globals.browser,
    },
  },
}

export default tseslint.config(...tseslint.configs.recommended, config)

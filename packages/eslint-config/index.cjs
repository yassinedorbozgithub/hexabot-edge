const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const importPlugin = require('eslint-plugin-import');
const headerPlugin = require('eslint-plugin-header');
const jsdocPlugin = require('eslint-plugin-jsdoc');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');

// eslint-plugin-header predates ESLint 9, which requires a rule schema.
if (!headerPlugin.rules.header.meta.schema) {
  headerPlugin.rules.header.meta.schema = {
    type: 'array',
  };
}

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

const createIgnores = (ignores) => ({
  ignores: ['dist', ...ignores, 'eslint.config.cjs', 'eslint.config-staged.cjs'],
});

const createHeaderRule = (headerYear) => [
  2,
  'block',
  [
    '',
    ' * Hexabot — Fair Core License (FCL-1.0-ALv2)',
    {
      pattern: '^ \\* Copyright \\(c\\) 20\\d{2} Hexastack\\.$',
      template: ` * Copyright (c) ${headerYear} Hexastack.`,
    },
    ' * Full terms: see LICENSE.md.',
    ' ',
  ],
  2,
];

const unusedVarsRule = [
  'error',
  {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_',
  },
];

const buildNodeConfig = ({
  rootDir,
  project = 'tsconfig.json',
  headerYear = '2025',
  ignores = [],
  globals: extraGlobals = {},
  rules = {},
}) => [
  createIgnores(ignores),
  ...compat.extends(
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ),
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project,
        tsconfigRootDir: rootDir,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...extraGlobals,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
      header: headerPlugin,
      jsdoc: jsdocPlugin,
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': unusedVarsRule,
      '@typescript-eslint/no-namespace': 'off',
      'padding-line-between-statements': [
        2,
        { blankLine: 'always', prev: '*', next: 'export' },
        { blankLine: 'always', prev: '*', next: 'function' },
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'never', prev: 'const', next: 'const' },
      ],
      'lines-between-class-members': ['warn', 'always'],
      'no-console': 2,
      'no-duplicate-imports': 'off',
      'import/no-duplicates': 'error',
      'object-shorthand': 1,
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'unknown',
            'parent',
            'sibling',
            'index',
            'internal',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'header/header': createHeaderRule(headerYear),
      'no-multiple-empty-lines': ['error', { max: 1 }],
      'jsdoc/tag-lines': 'error',
      ...rules,
    },
  },
];

const buildReactConfig = ({ headerYear = '2025', ignores = [], rules = {} }) => [
  createIgnores(ignores),
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  js.configs.recommended,
  ...compat.extends(
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
      header: headerPlugin,
      jsdoc: jsdocPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': unusedVarsRule,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTaggedTemplates: true,
          allowTernary: true,
        },
      ],
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      'import/newline-after-import': 'error',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'unknown',
            'index',
            'internal',
            'parent',
            'sibling',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'newline-after-var': 'error',
      'newline-before-return': 'error',
      'no-console': 'error',
      'no-duplicate-imports': 'off',
      'import/no-duplicates': 'error',
      'object-shorthand': 'error',
      'prefer-const': 'off',
      'padding-line-between-statements': [
        'error',
        { blankLine: 'never', prev: ['const'], next: 'const' },
      ],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-curly-brace-presence': 'warn',
      'react/self-closing-comp': 'error',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/unsupported-syntax': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/static-components': 'off',
      'header/header': createHeaderRule(headerYear),
      'no-multiple-empty-lines': ['error', { max: 1 }],
      'jsdoc/tag-lines': 'error',
      'no-extra-boolean-cast': 'off',
      'no-unsafe-optional-chaining': 'off',
      ...rules,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];

// Attaches `createConfig` so `eslint.config-staged.cjs` can rebuild the same
// config with overrides (e.g. the current year for the license header).
const withCreateConfig = (build) => (options = {}) => {
  const config = build(options);

  config.createConfig = (overrides) => build({ ...options, ...overrides });

  return config;
};

module.exports = {
  createNodeConfig: withCreateConfig(buildNodeConfig),
  createReactConfig: withCreateConfig(buildReactConfig),
  globals,
};

const { createNodeConfig, globals } = require('@hexabot-ai/eslint-config');

module.exports = createNodeConfig({
  rootDir: __dirname,
  globals: globals.jest,
  rules: {
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { disallowTypeAnnotations: false },
    ],
    'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
  },
});

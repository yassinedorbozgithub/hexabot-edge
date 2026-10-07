const { createNodeConfig } = require('@hexabot-ai/eslint-config');

module.exports = createNodeConfig({
  rootDir: __dirname,
  project: 'tsconfig.eslint.json',
  globals: {
    fetch: 'readonly',
  },
  rules: {
    'no-console': 'off',
  },
});

const { createNodeConfig, globals } = require('@hexabot-ai/eslint-config');

module.exports = createNodeConfig({
  rootDir: __dirname,
  project: 'tsconfig.eslint.json',
  headerYear: '2026',
  globals: globals.jest,
  rules: {
    'no-console': 'off',
  },
});

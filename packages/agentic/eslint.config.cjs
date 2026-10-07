const { createNodeConfig, globals } = require('@hexabot-ai/eslint-config');

module.exports = createNodeConfig({
  rootDir: __dirname,
  project: 'tsconfig.eslint.json',
  globals: globals.jest,
  rules: {
    'no-console': 'off',
  },
});

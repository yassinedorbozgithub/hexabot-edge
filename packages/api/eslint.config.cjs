const { createNodeConfig, globals } = require('@hexabot-ai/eslint-config');

module.exports = createNodeConfig({
  rootDir: __dirname,
  globals: globals.jest,
});

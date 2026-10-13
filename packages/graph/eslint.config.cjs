const { createReactConfig } = require("@hexabot-ai/eslint-config");

module.exports = createReactConfig({
  ignores: ["coverage"],
  rules: {
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { disallowTypeAnnotations: false },
    ],
    "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
  },
});

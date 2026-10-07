const { createReactConfig } = require("@hexabot-ai/eslint-config");

// The widget is stricter than the other React packages: it keeps the
// recommended presets' defaults for the rules they turn off.
module.exports = createReactConfig({
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/ban-ts-comment": "error",
    "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
    "no-duplicate-imports": "error",
    "import/no-duplicates": "off",
    "prefer-const": "error",
    "react/jsx-no-target-blank": "off",
    "react/prop-types": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-extra-boolean-cast": "error",
    "no-unsafe-optional-chaining": "error",
  },
});

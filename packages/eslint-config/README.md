# @hexabot-ai/eslint-config

Shared ESLint flat configs for the Hexabot workspace packages. Private: never published.

It owns every ESLint plugin dependency. A consuming package only needs `eslint` and `"@hexabot-ai/eslint-config": "workspace:*"` in its `devDependencies`.

## Presets

- `createNodeConfig(options)`: TypeScript packages linted with type information (`api`, `agentic`, `cli`, `types`).
- `createReactConfig(options)`: React packages (`frontend`, `graph`, `widget`).

Both enforce the license header, import order and Prettier formatting.

| Option | Presets | Default | Description |
| --- | --- | --- | --- |
| `rootDir` | node (required) | – | Package directory (`__dirname`), used as `tsconfigRootDir`. |
| `project` | node | `'tsconfig.json'` | tsconfig used for typed linting, relative to `rootDir`. |
| `globals` | node | `{}` | Extra globals merged on top of Node's (e.g. `globals.jest`). |
| `headerYear` | both | `'2025'` | Year inserted when `--fix` adds a missing license header. |
| `ignores` | both | `[]` | Extra ignore patterns (`dist` and the config files are always ignored). |
| `rules` | both | `{}` | Rule overrides for the package. |

The package also re-exports [`globals`](https://www.npmjs.com/package/globals).

## Usage

```js
// packages/<name>/eslint.config.cjs
const { createNodeConfig, globals } = require('@hexabot-ai/eslint-config');

module.exports = createNodeConfig({
  rootDir: __dirname,
  globals: globals.jest,
});
```

The returned config has a `createConfig(overrides)` method that rebuilds it with the same options plus overrides. `eslint.config-staged.cjs` uses it to stamp the current year into new license headers:

```js
module.exports = require('./eslint.config.cjs').createConfig({
  headerYear: String(new Date().getFullYear()),
});
```

Lint caching: the Turbo `lint` task depends on `^lint`, so changing this package invalidates the cached lint results of every package that uses it.

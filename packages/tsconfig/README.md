# @hexabot-ai/tsconfig

Shared TypeScript configs for the Hexabot workspace packages. Private: never published.

A consuming package adds `"@hexabot-ai/tsconfig": "workspace:*"` to its `devDependencies` and extends one preset.

## Presets

| Preset | Used by | Adds on top of `base.json` |
| --- | --- | --- |
| `base.json` | `cli` | `strict`, `skipLibCheck`, `esModuleInterop`, `forceConsistentCasingInFileNames` |
| `node-library.json` | `agentic`, `types` | ES2020, CommonJS, JSON modules, declarations + declaration maps |
| `react.json` | `frontend`, `graph`, `widget` | ES2020, DOM libs, bundler resolution, `isolatedModules`, `react-jsx`, `noEmit` |

`api` does not extend a preset: its Nest config (decorators, relaxed strictness) shares nothing worth factoring out.

## Usage

```jsonc
// packages/<name>/tsconfig.json
{
  "extends": "@hexabot-ai/tsconfig/node-library.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "types": ["jest", "node"]
  },
  "include": ["src/**/*"]
}
```

Keep path-based options (`rootDir`, `outDir`, `paths`, `include`, `exclude`, `tsBuildInfoFile`) in the package config: TypeScript resolves them relative to the file that declares them, so they would point inside this package if set here. `types` and `incremental` also stay local because they differ between packages.

Docker: the API, frontend and widget images copy this directory in their `deps` stage, since builds need the preset files and not just `package.json`.

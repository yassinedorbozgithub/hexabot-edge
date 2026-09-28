/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import path from "path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const monorepoRoot = path.resolve(__dirname, "../..");
const graphSrc = path.resolve(__dirname, "../graph/src");

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Avoid one-time dev-server reload when YAML editor first mounts its worker.
    include: ["monaco-yaml", "monaco-yaml/yaml.worker.js"],
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
      sass: {
        api: "modern-compiler",
      },
    },
  },
  resolve: {
    alias: [
      // Exact match only, so the slim entry can still import `monaco-editor/esm/...`.
      {
        find: /^monaco-editor$/,
        replacement: path.resolve(__dirname, "./src/utils/monaco-editor.ts"),
      },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      {
        find: "@hexabot-ai/agentic",
        replacement: path.resolve(__dirname, "../agentic/src"),
      },
      {
        find: "@hexabot-ai/types",
        replacement: path.resolve(__dirname, "../types/src"),
      },
      {
        find: "@hexabot-ai/widget",
        replacement: path.resolve(__dirname, "../widget/src/index.tsx"),
      },
      // Sub-path alias must come before the bare package alias.
      {
        find: "@hexabot-ai/graph/workflow.css",
        replacement: path.resolve(graphSrc, "workflow/styles/index.css"),
      },
      {
        find: "@hexabot-ai/graph",
        replacement: path.resolve(graphSrc, "index.ts"),
      },
      {
        find: "@rjsf/validator-ajv8",
        replacement: path.resolve(
          __dirname,
          "./src/utils/rjsf-zod-validator.ts",
        ),
      },
    ],
  },
  server: {
    host: true,
    port: 8080,
    fs: {
      allow: [monorepoRoot], // allow Vite to serve shared workspace deps like hoisted node_modules
    },
    watch: {
      // Use polling so atomic writes (inode swaps) in workspace packages are
      // always detected as a "change" event rather than an unlink+add pair
      // that can miss triggering hotUpdate.
      usePolling: true,
      interval: 100,
      // No custom `ignored` — Vite's defaults already exclude node_modules/.git
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000/",
      },
      "/socket.io": {
        target: "ws://localhost:3000/",
      },
    },
  },
  build: {
    // Skip gzip-size reporting for the multi-MB bundle; it only affects log output.
    reportCompressedSize: false,
  },
  preview: {
    host: true,
    port: 8080,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});

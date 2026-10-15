FROM node:24.17-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"

RUN corepack enable

RUN apk add --no-cache python3 make g++ linux-headers

WORKDIR /app

# Keeps only the extensions' package.json files (with their paths), so
# dependency layers are not rebuilt when extension source changes.
FROM base AS extension-manifests

COPY packages/api/src/extensions /extensions

RUN mkdir -p /manifests \
  && cd /extensions \
  && find . -mindepth 3 -maxdepth 3 -name package.json \
    | xargs -I{} sh -c 'mkdir -p "/manifests/$(dirname {})" && cp {} "/manifests/{}"'

FROM base AS deps

# Selects the database drivers to install (see scripts/install-db.mjs). Build-time
# only: RUN steps see it, but it is not baked into the image's environment.
ARG DB_TYPE=sqlite

WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml .pnpmfile.cjs ./
COPY packages/api/package.json packages/api/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/tsconfig ./packages/tsconfig
COPY packages/frontend/package.json packages/frontend/package.json
COPY packages/widget/package.json packages/widget/package.json
COPY packages/agentic/package.json packages/agentic/package.json
COPY packages/graph/package.json packages/graph/package.json
COPY --from=extension-manifests /manifests packages/api/src/extensions
COPY scripts/install-db.mjs scripts/install-db.mjs

RUN node scripts/install-db.mjs --filter @hexabot-ai/api... --filter "./packages/api/src/extensions/**" --prod=false --network-concurrency 4

FROM deps AS build

COPY packages/api ./packages/api
COPY packages/types ./packages/types
COPY packages/frontend ./packages/frontend
COPY packages/widget ./packages/widget
COPY packages/agentic ./packages/agentic
COPY packages/graph ./packages/graph

RUN pnpm --filter @hexabot-ai/types run build
RUN pnpm --filter @hexabot-ai/agentic run build
RUN pnpm --filter @hexabot-ai/api run build

FROM base AS development

ENV NODE_ENV=development
# node_modules is baked into the image; don't let pnpm re-install on every script run
ENV pnpm_config_verify_deps_before_run=false

COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml .pnpmfile.cjs ./
COPY --from=deps /root/.cache/node/corepack /root/.cache/node/corepack
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/scripts ./scripts
COPY --from=deps /app/packages ./packages
COPY packages/api ./packages/api
COPY packages/agentic ./packages/agentic
COPY packages/types ./packages/types

EXPOSE 3000

CMD ["pnpm", "--filter", "@hexabot-ai/api", "run", "start:debug"]

FROM base AS production-deps

# Selects the database drivers to install (see scripts/install-db.mjs). Build-time
# only: RUN steps see it, but it is not baked into the image's environment.
ARG DB_TYPE=sqlite

WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml .pnpmfile.cjs ./
COPY packages/api/package.json packages/api/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/frontend/package.json packages/frontend/package.json
COPY packages/widget/package.json packages/widget/package.json
COPY packages/agentic/package.json packages/agentic/package.json
COPY packages/graph/package.json packages/graph/package.json
COPY --from=extension-manifests /manifests packages/api/src/extensions
COPY scripts/install-db.mjs scripts/install-db.mjs

RUN node scripts/install-db.mjs --filter @hexabot-ai/api... --filter "./packages/api/src/extensions/**" --prod --network-concurrency 4

FROM base AS production

ENV NODE_ENV=production

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=production-deps /app/packages ./packages
COPY --from=build /app/packages/api/dist ./packages/api/dist
COPY --from=build /app/packages/types/dist ./packages/types/dist
COPY --from=build /app/packages/agentic/dist ./packages/agentic/dist
COPY packages/api/assets ./packages/api/assets
COPY packages/api/documentation ./packages/api/documentation

EXPOSE 3000

CMD ["node", "packages/api/dist/main"]

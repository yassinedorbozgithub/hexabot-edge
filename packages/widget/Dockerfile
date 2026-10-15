FROM node:24.17-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"

RUN corepack enable

WORKDIR /app

# Keeps only the extensions' package.json files (with their paths): the
# workspace and .pnpmfile.cjs need them to match the shared lockfile.
FROM base AS extension-manifests

COPY packages/api/src/extensions /extensions

RUN mkdir -p /manifests \
  && cd /extensions \
  && find . -mindepth 3 -maxdepth 3 -name package.json \
    | xargs -I{} sh -c 'mkdir -p "/manifests/$(dirname {})" && cp {} "/manifests/{}"'

FROM base AS deps

COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml .pnpmfile.cjs ./
COPY packages/api/package.json packages/api/package.json
COPY packages/frontend/package.json packages/frontend/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/tsconfig ./packages/tsconfig
COPY packages/widget/package.json packages/widget/package.json
COPY --from=extension-manifests /manifests packages/api/src/extensions

RUN pnpm install --filter @hexabot-ai/widget... --prod=false --network-concurrency 4

FROM deps AS development

ARG VITE_WIDGET_API_URL
ARG VITE_WIDGET_CHANNEL

ENV NODE_ENV=development
ENV VITE_WIDGET_API_URL=${VITE_WIDGET_API_URL}
ENV VITE_WIDGET_CHANNEL=${VITE_WIDGET_CHANNEL}

COPY packages/types ./packages/types
COPY packages/widget ./packages/widget

WORKDIR /app/packages/widget
EXPOSE 5173

CMD ["pnpm", "--filter", "@hexabot-ai/widget", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

FROM deps AS builder

ARG VITE_WIDGET_API_URL
ARG VITE_WIDGET_CHANNEL

ENV NODE_ENV=production
ENV VITE_WIDGET_API_URL=${VITE_WIDGET_API_URL}
ENV VITE_WIDGET_CHANNEL=${VITE_WIDGET_CHANNEL}

COPY packages/types ./packages/types
COPY packages/widget ./packages/widget

RUN pnpm --filter @hexabot-ai/widget... run build

FROM node:24.17-alpine AS production

ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"

RUN corepack enable && pnpm add -g http-server

WORKDIR /app

COPY --from=builder /app/packages/widget/dist ./dist

EXPOSE 5173

CMD ["http-server", "dist", "-p", "5173", "-a", "0.0.0.0"]

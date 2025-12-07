# syntax=docker/dockerfile:1

###########################################################################
# Base image with pnpm enabled
###########################################################################
FROM node:20-alpine AS base

WORKDIR /usr/src/app

# Enable pnpm via Corepack
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable && \
    apk add --no-cache openssl

###########################################################################
# Build frontend
###########################################################################
FROM base AS frontend-build

WORKDIR /frontend

# Копируем файлы фронтенда
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --prefer-offline --frozen-lockfile

COPY frontend ./
# Используем относительные пути для API (тот же домен)
ENV VITE_API_URL=/api/v1
ENV VITE_SOCKET_URL=
RUN pnpm run build

###########################################################################
# Install all dependencies (including dev) for building backend
###########################################################################
FROM base AS deps

WORKDIR /usr/src/app

COPY server/package.json ./
RUN pnpm install --prefer-offline

###########################################################################
# Build backend application
###########################################################################
FROM deps AS build

COPY server/tsconfig*.json ./
COPY server/nest-cli.json ./
COPY server/drizzle.config.ts ./
COPY server/src ./src
COPY server/drizzle ./drizzle

# Копируем собранный фронтенд
COPY --from=frontend-build /frontend/dist ./frontend

RUN pnpm run build

###########################################################################
# Install only production dependencies
###########################################################################
FROM base AS prod-deps

WORKDIR /usr/src/app

COPY server/package.json ./
RUN pnpm install --prod --prefer-offline

###########################################################################
# Install drizzle-kit for migrations (needed in production)
###########################################################################
FROM base AS prod-deps-with-migrations

WORKDIR /usr/src/app

COPY server/package.json ./
RUN pnpm install --prod --prefer-offline && \
    pnpm add -D drizzle-kit@^0.31.7 --prefer-offline

###########################################################################
# Final runtime image
###########################################################################
FROM node:20-alpine AS runner

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Enable pnpm via Corepack for migrations
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable

COPY --from=prod-deps-with-migrations /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/frontend ./frontend
COPY server/package.json ./

# Копируем файлы, необходимые для drizzle-kit migrate
COPY --from=build /usr/src/app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /usr/src/app/tsconfig.json ./tsconfig.json
COPY --from=build /usr/src/app/src/database ./src/database
COPY --from=build /usr/src/app/drizzle ./drizzle

EXPOSE 3000
CMD ["node", "dist/main"]


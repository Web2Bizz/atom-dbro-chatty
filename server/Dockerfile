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
# Install all dependencies (including dev) for building
###########################################################################
FROM base AS deps

COPY package.json ./
RUN pnpm install --prefer-offline

###########################################################################
# Build application
###########################################################################
FROM deps AS build

COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src
COPY drizzle ./drizzle

RUN pnpm run build

###########################################################################
# Install only production dependencies
###########################################################################
FROM base AS prod-deps

COPY package.json ./
RUN pnpm install --prod --prefer-offline

###########################################################################
# Final runtime image
###########################################################################
FROM node:20-alpine AS runner

WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY package.json ./

EXPOSE 3000
CMD ["node", "dist/main"]


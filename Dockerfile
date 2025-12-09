# syntax=docker/dockerfile:1

###########################################################################
# Base image
###########################################################################
FROM node:20-alpine AS base

# Установка pnpm глобально
RUN npm install -g pnpm

WORKDIR /usr/src/app

###########################################################################
# Build frontend
###########################################################################
FROM base AS frontend-build

WORKDIR /frontend

COPY frontend/package.json ./
COPY frontend/pnpm-lock.yaml ./
RUN pnpm install

COPY frontend ./
ENV VITE_API_URL=/api/v1
ENV VITE_SOCKET_URL=
RUN pnpm run build

###########################################################################
# Build backend
###########################################################################
FROM base AS backend-build

WORKDIR /usr/src/app

# Установка зависимостей для сборки
COPY server/package.json ./
COPY server/pnpm-lock.yaml ./
RUN pnpm install

# Копирование исходников и конфигурации
COPY server/tsconfig*.json ./
COPY server/nest-cli.json ./
COPY server/drizzle.config.ts ./
COPY build.sh ./
COPY server/src ./src
COPY server/drizzle ./drizzle
RUN chmod +x build.sh

# Копирование собранного фронтенда
COPY --from=frontend-build /frontend/dist ./frontend

# Временное изменение tsconfig.json для Docker (outDir должен быть ./dist, а не ../dist)
# В Docker все файлы уже в корне, поэтому dist должен быть в текущей директории
RUN sed -i 's|"outDir": "../dist"|"outDir": "./dist"|g' tsconfig.json && \
    sed -i 's|"tsBuildInfoFile": "../dist/tsconfig.tsbuildinfo"|"tsBuildInfoFile": "./dist/tsconfig.tsbuildinfo"|g' tsconfig.json

# Сборка бэкенда через build.sh
RUN sh build.sh

###########################################################################
# Final runtime image
###########################################################################
FROM base AS runner

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Установка только production зависимостей + drizzle-kit для миграций
COPY server/package.json ./
COPY server/pnpm-lock.yaml ./
RUN pnpm install --prod && \
    pnpm add -D drizzle-kit@^0.31.7

# Копирование собранного приложения
COPY --from=backend-build /usr/src/app/dist ./dist
COPY --from=backend-build /usr/src/app/frontend ./frontend

# Копирование файлов для миграций
COPY --from=backend-build /usr/src/app/drizzle.config.ts ./
COPY --from=backend-build /usr/src/app/tsconfig.json ./
COPY --from=backend-build /usr/src/app/src/database ./src/database
COPY --from=backend-build /usr/src/app/drizzle ./drizzle

EXPOSE 3000
CMD ["node", "dist/main"]


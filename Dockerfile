# syntax=docker/dockerfile:1

###########################################################################
# Base image
###########################################################################
FROM node:20-alpine AS base

WORKDIR /usr/src/app

###########################################################################
# Build frontend
###########################################################################
FROM base AS frontend-build

WORKDIR /frontend

COPY frontend/package.json ./
RUN npm install

COPY frontend ./
ENV VITE_API_URL=/api/v1
ENV VITE_SOCKET_URL=
RUN npm run build

###########################################################################
# Build backend
###########################################################################
FROM base AS backend-build

WORKDIR /usr/src/app

# Установка зависимостей для сборки
COPY server/package.json ./
RUN npm install

# Копирование исходников и конфигурации
COPY server/tsconfig*.json ./
COPY server/nest-cli.json ./
COPY server/drizzle.config.ts ./
COPY server/src ./src
COPY server/drizzle ./drizzle

# Копирование собранного фронтенда
COPY --from=frontend-build /frontend/dist ./frontend

# Сборка бэкенда
RUN npm run build

###########################################################################
# Final runtime image
###########################################################################
FROM node:20-alpine AS runner

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Установка только production зависимостей + drizzle-kit для миграций
COPY server/package.json ./
RUN npm install --production && \
    npm install -D drizzle-kit@^0.31.7

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


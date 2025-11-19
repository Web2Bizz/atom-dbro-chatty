# Chatty Backend Server

Backend сервер на NestJS с поддержкой PostgreSQL, Drizzle ORM, Zod валидации и Socket.io.

## Технологии

- **NestJS** - прогрессивный Node.js фреймворк
- **TypeScript** - типизированный JavaScript
- **PostgreSQL** - реляционная база данных
- **Drizzle ORM** - легковесный ORM
- **Zod** - схема валидации TypeScript-first
- **zod-openapi** - генерация OpenAPI из Zod схем (опционально)
- **Socket.io** - real-time коммуникация

## Быстрый старт

1. **Установите зависимости:**
```bash
pnpm install
```

2. **Настройте базу данных:**
   - Создайте `.env` файл (см. `.env.example`)
   - Настройте `DATABASE_URL`

3. **Примените миграции:**
```bash
pnpm run db:generate
pnpm run db:migrate
```

4. **Запустите сервер:**
```bash
pnpm run start:dev
```

## Подробная документация

См. [SETUP.md](./SETUP.md) для детальной информации о настройке и использовании.

## Docker

Сборка и запуск контейнера:
```bash
# Сборка образа (находясь в корне репозитория)
docker build -f server/Dockerfile -t chatty-server .

# Запуск контейнера
docker run -p 3000:3000 --env-file server/.env chatty-server
```

### Docker Compose (в корне проекта)

```bash
# Запустить только PostgreSQL
docker compose --profile db up -d

# Запустить всё приложение (сервер + PostgreSQL)
docker compose --profile app --profile db up --build

# Остановить и удалить контейнеры
docker compose down
```

## API Documentation

Swagger документация доступна по адресу: **http://localhost:3000/swagger**

В Swagger UI можно:
- Просмотреть все доступные endpoints
- Протестировать API прямо из браузера
- Авторизоваться с помощью API ключа (кнопка "Authorize")

## API Versioning

API использует URI версионирование. Все endpoints доступны по пути `/api/v1/...`

Примеры:
- `GET /api/v1/users` - список пользователей
- `POST /api/v1/rooms` - создание комнаты
- `GET /api/v1/auth/api-keys/:userId` - получение API ключей

## API Endpoints

### App
- `GET /api/v1/` - Приветственное сообщение
- `GET /api/v1/health` - Проверка здоровья сервера
- `GET /api/v1/protected` - Пример защищенного endpoint (требует API ключ)

### Auth
- `POST /api/v1/auth/api-keys` - Создать новый API ключ (публичный)
- `GET /api/v1/auth/api-keys/:userId` - Получить все ключи пользователя
- `DELETE /api/v1/auth/api-keys/:id` - Отозвать API ключ
- `DELETE /api/v1/auth/api-keys/:id/delete` - Удалить API ключ

### Users
- `GET /api/v1/users` - Список пользователей
- `POST /api/v1/users` - Создание пользователя
- `GET /api/v1/users/:id` - Получение пользователя
- `PATCH /api/v1/users/:id` - Обновление пользователя
- `DELETE /api/v1/users/:id` - Удаление пользователя

### Rooms
- `GET /api/v1/rooms` - Список всех комнат
- `POST /api/v1/rooms` - Создание комнаты
- `GET /api/v1/rooms/:id` - Получение комнаты по ID

## Socket.io Events

- `message` - Отправка сообщения
- `join-room` - Присоединение к комнате
- `leave-room` - Выход из комнаты

## Валидация

Все входящие данные валидируются с помощью Zod схем. Socket.io события также используют Zod для валидации.


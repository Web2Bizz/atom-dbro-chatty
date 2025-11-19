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

## API Endpoints

- `GET /` - Приветственное сообщение
- `GET /health` - Проверка здоровья сервера
- `GET /users` - Список пользователей
- `POST /users` - Создание пользователя
- `GET /users/:id` - Получение пользователя
- `PATCH /users/:id` - Обновление пользователя
- `DELETE /users/:id` - Удаление пользователя
- `GET /rooms` - Список комнат
- `POST /rooms` - Создание комнаты
- `GET /rooms/:id` - Получение информации о комнате

## Socket.io Events

- `message` - Отправка сообщения
- `join-room` - Присоединение к комнате
- `leave-room` - Выход из комнаты

## Валидация

Все входящие данные валидируются с помощью Zod схем. Socket.io события также используют Zod для валидации.


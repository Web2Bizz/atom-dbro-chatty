# Настройка Backend

## Быстрый старт

1. **Установите зависимости:**
```bash
cd server
pnpm install
```

2. **Настройте базу данных:**
   - Создайте базу данных PostgreSQL
   - Скопируйте `.env.example` в `.env` (если еще не создан)
   - Обновите `DATABASE_URL` в `.env` файле

3. **Примените миграции:**
```bash
pnpm run db:generate  # Генерация миграций из схем
pnpm run db:migrate   # Применение миграций
```

4. **Запустите сервер:**
```bash
pnpm run start:dev
```

## Структура проекта

```
server/
├── src/
│   ├── main.ts                 # Точка входа приложения
│   ├── app/                    # Главный модуль/контроллер/сервис
│   ├── auth/                   # Модуль авторизации и API-ключей
│   ├── database/               # Модуль базы данных
│   │   ├── database.module.ts  # Drizzle конфигурация
│   │   ├── schema/             # Drizzle схемы
│   │   │   ├── index.ts
│   │   │   ├── users.ts
│   │   │   ├── api-keys.ts
│   │   │   └── rooms.ts
│   │   └── drizzle.config.ts   # Конфигурация drizzle-kit
│   ├── socket/                 # Socket.io модуль
│   │   ├── socket.module.ts
│   │   └── socket.gateway.ts   # WebSocket gateway
│   ├── users/                  # Пользовательские эндпоинты
│   ├── rooms/                  # Эндпоинты комнат
│   └── common/                 # Общие утилиты
│       ├── zod-validation.pipe.ts  # Zod валидация для NestJS
│       └── openapi/            # OpenAPI примеры
├── drizzle/                    # Миграции (генерируются автоматически)
├── .env                        # Переменные окружения
└── package.json
```

## Технологии

### NestJS
Прогрессивный Node.js фреймворк для построения эффективных и масштабируемых серверных приложений.

### Drizzle ORM
Легковесный и быстрый ORM для TypeScript с отличной типизацией.

**Работа с базой данных:**
```typescript
import { Database } from './database/database.module';
import { users } from './database/schema/users';
import { eq } from 'drizzle-orm';

// В сервисе
const allUsers = await this.db.select().from(users);
const user = await this.db.select().from(users).where(eq(users.id, userId));
```

### Zod
Схема валидации TypeScript-first для валидации данных.

**Использование:**
```typescript
import { z } from 'zod';
import { ZodValidationPipe } from './common/zod-validation.pipe';

const CreateUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
});

@Post()
@UsePipes(new ZodValidationPipe(CreateUserSchema))
async create(@Body() data: z.infer<typeof CreateUserSchema>) {
  // data уже валидирован
}
```

### Socket.io
Real-time двусторонняя коммуникация между клиентом и сервером.

**События на сервере:**
- `message` - отправка сообщения
- `join-room` - присоединение к комнате
- `leave-room` - выход из комнаты

**Подключение на клиенте:**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected');
});

socket.emit('message', { content: 'Hello', room: 'general' });
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

## Миграции базы данных

### Генерация миграций
После изменения схем в `src/database/schema/`:
```bash
pnpm run db:generate
```

### Применение миграций
```bash
pnpm run db:migrate
```

### Drizzle Studio
Визуальный редактор базы данных:
```bash
pnpm run db:studio
```

## Переменные окружения

Создайте `.env` файл в корне папки `server/`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/chatty
PORT=3000
NODE_ENV=development
```

## Разработка

### Запуск в режиме разработки
```bash
pnpm run start:dev
```

### Сборка для продакшна
```bash
pnpm run build
pnpm run start:prod
```

### Тестирование
```bash
pnpm run test
pnpm run test:watch
pnpm run test:cov
```

## Дополнительные возможности

### Zod OpenAPI
Для генерации OpenAPI документации из Zod схем установите:
```bash
pnpm add zod-openapi
```

Примеры использования в `src/common/openapi/README.md`


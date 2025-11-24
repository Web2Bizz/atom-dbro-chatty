# Руководство по тестированию чата поддержки

## Важно: Роли управляются внешним приложением

Микросервис **не управляет ролями** (модератор/пользователь). Это должно быть реализовано во внешнем приложении. Для тестирования вы можете:

1. **Использовать разных пользователей** - один будет "модератором", другой "пользователем" (логика определяется на клиенте)
2. **Создать таблицу ролей во внешнем приложении** - хранить информацию о том, кто является модератором

## Создание пользователей

### Через API

```bash
# Создать пользователя-модератора
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "moderator",
    "password": "password123"
  }'

# Создать обычного пользователя
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "password123"
  }'
```

### Через фронтенд

1. Откройте `http://localhost:5173/login` (или ваш фронтенд)
2. Нажмите "Зарегистрироваться" (если есть) или используйте форму регистрации
3. Создайте двух пользователей:
   - `moderator` / `password123`
   - `user1` / `password123`

## Вход в систему

### Через API

```bash
# Войти как модератор
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "moderator",
    "password": "password123"
  }'

# Ответ:
# {
#   "accessToken": "eyJhbGc...",
#   "refreshToken": "eyJhbGc...",
#   "user": {
#     "id": "uuid",
#     "username": "moderator"
#   }
# }

# Войти как пользователь
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "password123"
  }'
```

### Через фронтенд

1. Откройте страницу входа
2. Введите `username` и `password`
3. Нажмите "Войти"

## Создание чата поддержки

```bash
# Создать чат поддержки (нужен токен)
curl -X POST http://localhost:3000/api/v1/rooms \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Поддержка",
    "type": "support",
    "description": "Чат поддержки"
  }'
```

## Тестирование чата поддержки

### Сценарий 1: Пользователь пишет в поддержку

1. Войдите как `user1`
2. Откройте чат поддержки
3. Отправьте сообщение:
```bash
POST /api/v1/rooms/{supportRoomId}/messages
{
  "content": "Мне нужна помощь",
  "recipientId": null  # null = видно всем модераторам
}
```

### Сценарий 2: Модератор отвечает пользователю

1. Войдите как `moderator`
2. Откройте чат поддержки
3. Увидите все сообщения от пользователей
4. Ответьте конкретному пользователю:
```bash
POST /api/v1/rooms/{supportRoomId}/messages
{
  "content": "Чем могу помочь?",
  "recipientId": "user1-uuid"  # UUID пользователя user1
}
```

### Сценарий 3: Получение сообщений

**Для пользователя:**
```bash
GET /api/v1/rooms/{supportRoomId}/messages?userId={user1-uuid}&includeRecipients=true
```
Покажет: свои сообщения + ответы модератора ему

**Для модератора:**
```bash
GET /api/v1/rooms/{supportRoomId}/messages
```
Покажет: все сообщения в чате

## Управление ролями во внешнем приложении

Поскольку микросервис не управляет ролями, вам нужно:

1. **Создать таблицу ролей** во внешнем приложении (не в этом микросервисе)
2. **Хранить информацию о модераторах** в вашем приложении
3. **Передавать информацию о роли** в клиентское приложение (через JWT payload или отдельный endpoint)
4. **Фильтровать сообщения на клиенте** в зависимости от роли

### Пример структуры для внешнего приложения

```sql
-- Таблица ролей (во внешнем приложении, не в микросервисе)
CREATE TABLE user_roles (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  role varchar(20) NOT NULL DEFAULT 'user', -- 'user' или 'moderator'
  created_at timestamp DEFAULT now()
);

-- Добавить модератора
INSERT INTO user_roles (user_id, role) 
VALUES ('moderator-uuid', 'moderator');
```

### Пример проверки роли в клиенте

```typescript
// Во внешнем приложении
async function getUserRole(userId: string): Promise<'user' | 'moderator'> {
  // Запрос к вашему API для получения роли
  const response = await fetch(`/api/users/${userId}/role`);
  return response.json().role;
}

// Использование
const role = await getUserRole(currentUserId);
const isModerator = role === 'moderator';
```

## Быстрое тестирование через Swagger

1. Откройте `http://localhost:3000/swagger`
2. Зарегистрируйте двух пользователей через `/auth/register`
3. Войдите через `/auth/login` и скопируйте `accessToken`
4. Используйте токен для создания комнаты и отправки сообщений

## Текущие пользователи в базе

```bash
# Посмотреть всех пользователей
docker exec -i chatty-postgres psql -U postgres -d chatty -c "SELECT id, username, created_at FROM users;"
```

Текущие пользователи:
- `alex2004`
- `xarlein2004`

Вы можете использовать их для тестирования или создать новых.


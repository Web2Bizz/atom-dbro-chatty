# API для чата поддержки (Support Chat API)

Этот микросервис предоставляет API для реализации чата поддержки, где множество пользователей могут писать в чат, а модераторы могут отвечать каждому пользователю индивидуально.

## Архитектура

Микросервис **не управляет ролями и правами** - это ответственность внешнего приложения. Микросервис просто:
- Сохраняет сообщения с указанным `recipientId`
- Доставляет сообщения через WebSocket
- Предоставляет API для получения сообщений с фильтрацией

Внешнее приложение само решает:
- Кто является модератором
- Кто может видеть какие сообщения
- Кому можно отправлять сообщения

## Типы комнат

- `normal` - обычный чат, все сообщения видны всем участникам
- `support` - чат поддержки, видимость сообщений контролируется через `recipientId`

## Отправка сообщений

### REST API

```http
POST /api/v1/rooms/{roomId}/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Текст сообщения",
  "username": "опционально",
  "recipientId": "uuid или null"
}
```

**Параметры:**
- `content` (обязательно) - текст сообщения (1-1000 символов)
- `username` (опционально) - имя отправителя (по умолчанию берется из токена)
- `recipientId` (опционально) - UUID получателя или `null`

**Логика `recipientId` для чата поддержки:**
- `null` - сообщение видно всем модераторам (для сообщений пользователей или общих сообщений модераторов)
- `"user-uuid"` - приватное сообщение конкретному пользователю (для ответов модератора)

### WebSocket

```javascript
socket.emit('message', {
  message: 'Текст сообщения',
  room: 'room-uuid',
  username: 'опционально',
  recipientId: 'uuid или null'
});
```

## Получение сообщений

### REST API

```http
GET /api/v1/rooms/{roomId}/messages?limit=100&userId={userId}&includeRecipients=true
Authorization: Bearer <token>
```

**Query параметры:**
- `limit` (опционально, по умолчанию 100) - количество сообщений
- `userId` (опционально) - фильтр по пользователю
- `includeRecipients` (опционально, `true`/`false`) - если `true`, включает сообщения где `userId` или `recipientId` = `userId`

**Примеры использования:**

1. **Получить все сообщения комнаты** (для модератора):
```http
GET /api/v1/rooms/{roomId}/messages?limit=100
```

2. **Получить сообщения пользователя** (только его сообщения):
```http
GET /api/v1/rooms/{roomId}/messages?userId={userId}
```

3. **Получить сообщения для пользователя** (его сообщения + ответы модератора):
```http
GET /api/v1/rooms/{roomId}/messages?userId={userId}&includeRecipients=true
```

### WebSocket

Сообщения доставляются через событие `message`:

```javascript
socket.on('message', (data) => {
  console.log(data);
  // {
  //   id: 'message-uuid',
  //   username: 'sender-name',
  //   message: 'Текст сообщения',
  //   timestamp: '2025-01-01T00:00:00.000Z',
  //   recipientId: 'uuid или null',
  //   userId: 'sender-uuid',
  //   authType: 'user'
  // }
});
```

**Важно:** Внешнее приложение должно фильтровать сообщения на клиенте:
- Если `recipientId === null` - видно всем модераторам
- Если `recipientId === currentUserId` - видно этому пользователю и отправителю
- Если `userId === currentUserId` - это сообщение пользователя, видно ему и модераторам

## Сценарии использования

### Сценарий 1: Пользователь пишет в поддержку

```javascript
// Пользователь отправляет сообщение
POST /api/v1/rooms/{supportRoomId}/messages
{
  "content": "Мне нужна помощь",
  "recipientId": null  // null = видно всем модераторам
}
```

### Сценарий 2: Модератор отвечает пользователю

```javascript
// Модератор отвечает конкретному пользователю
POST /api/v1/rooms/{supportRoomId}/messages
{
  "content": "Чем могу помочь?",
  "recipientId": "user-uuid-here"  // Приватный ответ
}
```

### Сценарий 3: Модератор отправляет общее сообщение

```javascript
// Модератор отправляет сообщение всем модераторам
POST /api/v1/rooms/{supportRoomId}/messages
{
  "content": "Объявление для всех",
  "recipientId": null  // null = видно всем модераторам
}
```

### Сценарий 4: Получение сообщений для пользователя

```javascript
// Пользователь получает свои сообщения и ответы модератора
GET /api/v1/rooms/{supportRoomId}/messages?userId={userId}&includeRecipients=true
```

### Сценарий 5: Получение всех сообщений для модератора

```javascript
// Модератор видит все сообщения в чате поддержки
GET /api/v1/rooms/{supportRoomId}/messages?limit=100
```

## Фильтрация на клиенте

Внешнее приложение должно фильтровать сообщения при отображении:

```javascript
function shouldShowMessage(message, currentUserId, isModerator) {
  // Если это сообщение пользователя
  if (message.userId === currentUserId) {
    return true; // Пользователь видит свои сообщения
  }
  
  // Если это ответ модератора конкретному пользователю
  if (message.recipientId === currentUserId) {
    return true; // Пользователь видит ответы ему
  }
  
  // Если это сообщение без recipientId (для модераторов)
  if (message.recipientId === null && isModerator) {
    return true; // Модератор видит все сообщения без recipientId
  }
  
  // Если это сообщение с recipientId и пользователь - модератор
  if (message.recipientId !== null && isModerator) {
    return true; // Модератор видит все сообщения
  }
  
  return false;
}
```

## Создание комнаты поддержки

```http
POST /api/v1/rooms
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Поддержка",
  "type": "support",
  "description": "Чат поддержки"
}
```

## Примеры интеграции

### React компонент для чата поддержки

```typescript
function SupportChat({ roomId, userId, isModerator }) {
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    // Получаем сообщения
    fetch(`/api/v1/rooms/${roomId}/messages?userId=${userId}&includeRecipients=true`)
      .then(res => res.json())
      .then(data => {
        // Фильтруем сообщения на клиенте
        const filtered = data.filter(msg => 
          shouldShowMessage(msg, userId, isModerator)
        );
        setMessages(filtered);
      });
  }, [roomId, userId, isModerator]);
  
  const sendMessage = (content, recipientId = null) => {
    fetch(`/api/v1/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content,
        recipientId
      })
    });
  };
  
  return (
    <div>
      {messages.map(msg => (
        <Message key={msg.id} message={msg} />
      ))}
      <MessageInput 
        onSend={(content) => sendMessage(content, null)} 
      />
    </div>
  );
}
```

## Важные замечания

1. **Микросервис не проверяет права** - внешнее приложение само решает, кто может отправлять сообщения и кому
2. **Фильтрация на клиенте** - внешнее приложение должно фильтровать сообщения при отображении
3. **WebSocket доставляет все сообщения** - клиент должен сам решать, какие сообщения показывать
4. **`recipientId` контролируется клиентом** - микросервис просто сохраняет и доставляет значение как есть


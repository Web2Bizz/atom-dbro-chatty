# Инструкция по деплою приложения Chatty

## Предварительные требования

- Docker и Docker Compose установлены
- Git (для клонирования репозитория, если нужно)

## Шаги для деплоя

### 1. Подготовка окружения

#### Создание внешних сетей Docker

В `docker-compose.yml` используются внешние сети `atom-external-network` и `atom-internal-network`. Создайте их перед запуском:

```bash
docker network create atom-external-network
docker network create atom-internal-network
```

Если сети уже существуют, эти команды выдадут предупреждение, но это нормально.

### 2. Настройка переменных окружения

Создайте файл `server/.env` в директории проекта для настройки переменных окружения:

```env
# База данных
POSTGRES_DB=chatty
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_PORT=5432

# Приложение
PORT=3000
NODE_ENV=production

# Database URL (автоматически формируется из переменных выше)
DATABASE_URL=postgresql://postgres:your-secure-password@postgres:5432/chatty

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d

# CORS (опционально)
# CORS_ORIGINS=http://localhost:5173,https://yourdomain.com
```

**⚠️ ВАЖНО**: 
- В продакшене обязательно измените `JWT_SECRET`, `JWT_REFRESH_SECRET` и `POSTGRES_PASSWORD` на безопасные значения!
- Файл `.env` должен находиться в директории `server/`

### 3. Сборка и запуск контейнеров

#### Первый запуск (сборка образов):

```bash
docker compose up -d --build
```

#### Последующие запуски (без пересборки):

```bash
docker compose up -d
```

Эта команда:
- Соберёт образ приложения из Dockerfile (включая фронтенд и бэкенд)
- Запустит PostgreSQL контейнер
- Запустит приложение в контейнере
- Подождёт, пока PostgreSQL станет здоровым, перед запуском приложения

### 4. Выполнение миграций базы данных

После первого запуска контейнеров нужно выполнить миграции базы данных:

```bash
# Войти в контейнер приложения
docker exec -it chatty-server sh

# Выполнить миграции
npm run db:migrate

# Выйти из контейнера
exit
```

Или одной командой:

```bash
docker exec -it chatty-server npm run db:migrate
```

### 5. Проверка работы приложения

#### Проверить статус контейнеров:

```bash
docker compose ps
```

#### Просмотреть логи:

```bash
# Все сервисы
docker compose logs -f

# Только приложение
docker compose logs -f server

# Только база данных
docker compose logs -f postgres
```

#### Проверить доступность приложения:

- Приложение: http://localhost:3000 (или http://<IP_СЕРВЕРА>:3000 для доступа извне)
- API: http://localhost:3000/api/v1
- Swagger документация: http://localhost:3000/swagger
- Фронтенд: http://localhost:3000 (раздаётся через бэкенд)

**✅ Приложение настроено для доступа извне** - порт проброшен на все интерфейсы (0.0.0.0), поэтому сервис доступен не только с localhost, но и по IP-адресу сервера из внешней сети.

### 6. Остановка и удаление

#### Остановка контейнеров (без удаления):

```bash
docker compose stop
```

#### Остановка и удаление контейнеров:

```bash
docker compose down
```

#### Остановка, удаление контейнеров и volumes (⚠️ удалит данные БД):

```bash
docker compose down -v
```

## Полезные команды

### Пересборка приложения после изменений:

```bash
docker compose up -d --build server
```

### Выполнение команд внутри контейнера:

```bash
# Войти в контейнер приложения
docker exec -it chatty-server sh

# Выполнить миграции
docker exec -it chatty-server npm run db:migrate
```

### Просмотр логов в реальном времени:

```bash
docker compose logs -f server
```

### Проверка подключения к базе данных:

```bash
# Войти в контейнер PostgreSQL
docker exec -it chatty-postgres psql -U postgres -d chatty
```

## Решение проблем

### Проблема: Сеть не найдена

**Ошибка**: `network atom-external-network not found` или `network atom-internal-network not found`

**Решение**: Создайте сети командами:
```bash
docker network create atom-external-network
docker network create atom-internal-network
```

### Проблема: Порт уже занят

**Ошибка**: `port is already allocated`

**Решение**: Измените порт в `server/.env` файле или `docker-compose.yml`:
```env
PORT=3001
POSTGRES_PORT=5433
```

### Проблема: Приложение не подключается к БД

**Решение**: 
1. Убедитесь, что PostgreSQL контейнер запущен: `docker compose ps`
2. Проверьте переменную `DATABASE_URL` в контейнере: `docker exec chatty-server env | grep DATABASE_URL`
3. Проверьте логи: `docker compose logs postgres`

### Проблема: Изменения в коде не применяются

**Решение**: 
- Для production изменений нужно пересобрать образ:
```bash
docker compose up -d --build server
```
- При автоматическом деплое через GitHub Actions образ пересобирается автоматически при каждом push

## Production деплой

Для production окружения рекомендуется:

1. **Использовать .env файл** с безопасными паролями и секретами
2. **Настроить reverse proxy** (nginx, traefik) перед приложением
3. **Настроить SSL/TLS** сертификаты
4. **Использовать managed базу данных** вместо контейнера PostgreSQL
5. **Настроить мониторинг** и логирование
6. **Настроить backup** базы данных
7. **Использовать Docker secrets** для чувствительных данных

## Автоматический деплой через CI/CD (GitHub Actions)

Проект настроен для автоматического деплоя через GitHub Actions. При каждом push в ветку `main` происходит автоматическая сборка Docker образа, версионирование по дате, загрузка образа в Docker Registry и деплой на сервер с pull образа из Registry.

### Настройка GitHub Secrets

Перед использованием CI/CD необходимо настроить секреты в GitHub:

1. Перейдите в репозиторий на GitHub
2. Откройте **Settings** → **Secrets and variables** → **Actions**
3. Добавьте следующие секреты:

#### Обязательные секреты:

- **`DOCKER_REGISTRY_URL`** - URL Docker Registry
  - Пример: `docker-registry.web2bizz.store` или `registry.example.com`
  - ⚠️ **ВАЖНО**: 
    - Укажите полный URL без протокола (без `https://` или `http://`)
    - Не добавляйте путь `/v2/` или `/private/` - он будет добавлен автоматически
    - Правильно: `docker-registry.web2bizz.store`
    - Неправильно: `https://docker-registry.web2bizz.store` или `docker-registry.web2bizz.store/v2/`
    - Registry использует Basic Auth через nginx, поэтому URL должен указывать на домен nginx
  
- **`DOCKER_REGISTRY_USERNAME`** - Имя пользователя для доступа к Docker Registry
  - Пример: `myuser` или имя пользователя из htpasswd файла
  - ⚠️ **ВАЖНО**: 
    - Убедитесь, что пользователь существует в файле `/etc/nginx/auth/htpasswd` на сервере Registry
    - Пользователь должен иметь права на push/pull образов
    - Имя пользователя должно совпадать с тем, что используется в nginx Basic Auth
  
- **`DOCKER_REGISTRY_PASSWORD`** - Пароль для доступа к Docker Registry
  - Пароль из файла `/etc/nginx/auth/htpasswd` на сервере Registry
  - ⚠️ **ВАЖНО**: 
    - Пароль должен совпадать с паролем в htpasswd файле
    - Храните пароли в безопасности и регулярно обновляйте их
    - Для создания/обновления пользователя используйте: `htpasswd -B /etc/nginx/auth/htpasswd username`

- **`DEPLOY_HOST`** - IP-адрес или домен сервера деплоя
  - Пример: `192.168.1.100` или `deploy.example.com`
  
- **`DEPLOY_USER`** - Пользователь для SSH подключения
  - Пример: `root`, `deploy`, `ubuntu`
  
- **`DEPLOY_SSH_KEY`** - Приватный SSH ключ для доступа к серверу
  - Содержимое файла `~/.ssh/id_rsa` (или другого приватного ключа)
  - ⚠️ **ВАЖНО**: Используйте ключ без пароля или настройте ssh-agent
  
- **`DEPLOY_PROJECT_PATH`** - Абсолютный путь к директории проекта на сервере
  - Пример: `/home/user/chatty` или `/opt/chatty`
  - ⚠️ **ВАЖНО**: 
    - Путь должен существовать на сервере и содержать `docker-compose.yml`
    - Используйте абсолютный путь (не `~/`)

#### Опциональные секреты (с значениями по умолчанию):

- **`DOCKER_IMAGE_NAME`** - Название Docker образа
  - По умолчанию: `chatty`
  - ⚠️ **ВАЖНО**: 
    - Используйте только строчные буквы, цифры, дефисы, подчеркивания и точки
    - Не используйте заглавные буквы или специальные символы
    - Правильно: `chatty`, `my-app`, `app_v1.0`
    - Неправильно: `Chatty`, `my app`, `app@v1`

- **`DEPLOY_CONTAINER_NAME`** - Название контейнера приложения
  - По умолчанию: `chatty-server`
  - Должно соответствовать `container_name` в `docker-compose.yml`

- **`DEPLOY_SERVICE_NAME`** - Название сервиса в docker-compose.yml
  - По умолчанию: `server`
  - Должно соответствовать имени сервиса в `docker-compose.yml`

- **`DEPLOY_COMPOSE_PROJECT_NAME`** - Имя проекта (стек) для docker compose
  - По умолчанию: не установлен (используется имя директории)
  - Используйте, если нужно явно указать имя стека
  - Пример: `chatty`

- **`DEPLOY_SSH_PORT`** - Порт SSH
  - По умолчанию: `22`

### Настройка сервера для деплоя

#### 1. Установка Docker и Docker Compose

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. Создание директории проекта

```bash
# Создайте директорию для проекта (выберите подходящий путь)
# Вариант 1: в домашней директории пользователя
mkdir -p ~/chatty
cd ~/chatty

# Вариант 2: в системной директории
sudo mkdir -p /opt/chatty
sudo chown $USER:$USER /opt/chatty
cd /opt/chatty
```

**⚠️ ВАЖНО**: 
- Запомните выбранный путь - он понадобится для секрета `DEPLOY_PROJECT_PATH` в GitHub!
- Используйте абсолютный путь (например, `/home/user/chatty`, а не `~/chatty`)

#### 3. Копирование необходимых файлов на сервер

Скопируйте на сервер следующие файлы:

```bash
# docker-compose.yml
# server/.env (с production переменными окружения)
```

Или клонируйте репозиторий (только для чтения):

```bash
git clone https://github.com/YOUR_USERNAME/chatty.git ~/chatty
cd ~/chatty
```

**⚠️ ВАЖНО**: Убедитесь, что файл `docker-compose.yml` находится в корне директории проекта!

#### 4. Создание Docker сетей

```bash
docker network create atom-external-network
docker network create atom-internal-network
```

#### 5. Настройка .env файла

Создайте файл `server/.env` в директории проекта с production переменными:

```env
# База данных
POSTGRES_DB=chatty
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_PORT=5432

# Приложение
PORT=3000
NODE_ENV=production

# Database URL
DATABASE_URL=postgresql://postgres:your-secure-password@postgres:5432/chatty

# JWT
JWT_SECRET=your-very-secure-secret-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-very-secure-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d

# CORS (для production укажите домены фронтенда)
# CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

**Примечание**: Переменная `DOCKER_IMAGE_SERVER` будет установлена автоматически при деплое, не нужно указывать в .env файле.

#### 6. Настройка SSH ключа для GitHub Actions

**Важно**: SSH ключ должен быть настроен правильно, иначе деплой не будет работать.

##### Шаг 1: Создание SSH ключа

На вашем локальном компьютере создайте новую пару SSH ключей:

```bash
# Создайте SSH ключ (без пароля для автоматизации)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""

# Или используйте RSA (если ed25519 не поддерживается)
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""
```

**⚠️ ВАЖНО**: Не устанавливайте пароль на ключ (нажмите Enter при запросе passphrase), иначе GitHub Actions не сможет его использовать.

##### Шаг 2: Добавление публичного ключа на сервер

```bash
# Вариант 1: Используя ssh-copy-id (рекомендуется)
# Замените USER и HOST на ваши значения
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub USER@HOST

# Вариант 2: Вручную
# Скопируйте содержимое публичного ключа
cat ~/.ssh/github_actions_deploy.pub

# На сервере добавьте ключ в authorized_keys
# Подключитесь к серверу
ssh USER@HOST

# На сервере выполните:
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ВАШ_ПУБЛИЧНЫЙ_КЛЮЧ_СЮДА" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit
```

##### Шаг 3: Проверка SSH подключения

Проверьте, что подключение работает:

```bash
# Тест подключения с использованием приватного ключа
# Замените USER, HOST и PORT на ваши значения
ssh -i ~/.ssh/github_actions_deploy -p PORT USER@HOST \
  "echo 'SSH connection successful' && hostname"
```

Если подключение успешно, переходите к следующему шагу.

##### Шаг 4: Добавление приватного ключа в GitHub Secrets

```bash
# Покажите приватный ключ (скопируйте ВСЁ содержимое, включая заголовки)
cat ~/.ssh/github_actions_deploy
```

**Важно**: Копируйте весь ключ, включая строки:
- `-----BEGIN OPENSSH PRIVATE KEY-----` (или `-----BEGIN RSA PRIVATE KEY-----`)
- Все строки ключа
- `-----END OPENSSH PRIVATE KEY-----` (или `-----END RSA PRIVATE KEY-----`)

Добавьте скопированное содержимое в GitHub:
1. Перейдите в репозиторий → **Settings** → **Secrets and variables** → **Actions**
2. Нажмите **New repository secret**
3. Name: `DEPLOY_SSH_KEY`
4. Secret: вставьте весь приватный ключ
5. Нажмите **Add secret**

##### Шаг 5: Проверка прав доступа на сервере

Убедитесь, что пользователь имеет необходимые права:

```bash
# На сервере (замените USER и PROJECT_PATH на ваши значения)
sudo usermod -aG docker USER
# Проверьте права на директорию проекта
ls -la PROJECT_PATH
```

#### 7. Настройка прав доступа

```bash
# Убедитесь, что пользователь может выполнять docker команды
sudo usermod -aG docker $USER

# Настройте права на директорию проекта
chmod 755 ~/chatty
```

### Процесс автоматического деплоя

После настройки, при каждом push в ветку `main`:

1. **GitHub Actions запускает workflow** (`.github/workflows/deploy.yml`)
2. **Генерация версии образа** на основе даты и времени (формат: `YYYY-MM-DD-HHMMSS`, например: `2024-01-15-143022`)
3. **Сборка Docker образа** с использованием Docker Buildx (включает сборку фронтенда и бэкенда)
4. **Push образа в Docker Registry** с двумя тегами:
   - Версионный тег: `REGISTRY_URL/IMAGE_NAME:YYYY-MM-DD-HHMMSS`
   - Тег latest: `REGISTRY_URL/IMAGE_NAME:latest`
5. **Подключение к серверу через SSH** и выполнение деплоя:
   - Логин в Docker Registry
   - Pull образа из Registry (по версионному тегу)
   - Локальное тегирование образа для docker-compose
   - Остановка и удаление старых контейнеров
   - Запуск новых контейнеров через `docker compose` (все сервисы)
   - Проверка готовности контейнера сервера
   - Выполнение миграций базы данных (если необходимо)
   - Очистка неиспользуемых Docker ресурсов
6. **Уведомление о результате** в GitHub Actions

**⚠️ ВАЖНО**: 
- Образы версионируются по дате и времени сборки для возможности отката к любой версии
- Перезапускаются **все контейнеры** (сервер и база данных)
- Используется `docker compose` (не `docker-compose`)
- Все образы хранятся в централизованном Docker Registry
- Фронтенд встроен в образ бэкенда и раздаётся через `ServeStaticModule`

### Ручной деплой

Для ручного деплоя выполните следующие шаги:

#### Вариант 1: Деплой latest версии из Registry

1. **На сервере войдите в Docker Registry**:
```bash
# Замените на ваш реальный Registry URL и credentials
docker login docker-registry.web2bizz.store -u YOUR_USERNAME -p YOUR_PASSWORD
```

2. **Загрузите образ из Registry**:
```bash
# Замените на ваш реальный Registry URL
docker pull docker-registry.web2bizz.store/chatty:latest
docker tag docker-registry.web2bizz.store/chatty:latest chatty:latest
```

3. **Перезапустите контейнеры**:
```bash
cd /path/to/project
export DOCKER_IMAGE_SERVER="chatty:latest"
docker compose up -d --pull never
```

#### Вариант 2: Деплой конкретной версии из Registry

1. **На сервере войдите в Docker Registry**:
```bash
# Замените на ваш реальный Registry URL и credentials
docker login docker-registry.web2bizz.store -u YOUR_USERNAME -p YOUR_PASSWORD
```

2. **Загрузите конкретную версию образа** (например, `2024-01-15-143022`):
```bash
# Замените на ваш реальный Registry URL и версию
docker pull docker-registry.web2bizz.store/chatty:2024-01-15-143022
docker tag docker-registry.web2bizz.store/chatty:2024-01-15-143022 chatty:latest
```

3. **Перезапустите контейнеры**:
```bash
cd /path/to/project
export DOCKER_IMAGE_SERVER="chatty:latest"
docker compose up -d --pull never
```

### Troubleshooting CI/CD

#### Проблема: GitHub Actions не может подключиться к серверу

**Ошибка**: `Permission denied (publickey)`

**Решение**:

1. **Проверьте, что SSH ключ добавлен в GitHub Secrets**:
   - Убедитесь, что секрет `DEPLOY_SSH_KEY` существует
   - Проверьте, что ключ скопирован полностью (включая заголовки `-----BEGIN` и `-----END`)
   - Убедитесь, что нет лишних пробелов или переносов строк

2. **Проверьте публичный ключ на сервере**:
   ```bash
   # На сервере
   cat ~/.ssh/authorized_keys
   # Должен быть ваш публичный ключ (начинается с ssh-ed25519 или ssh-rsa)
   ```

3. **Проверьте права доступа на сервере**:
   ```bash
   # На сервере
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ls -la ~/.ssh
   ```

4. **Проверьте SSH доступ вручную**:
   ```bash
   # На локальном компьютере
   ssh -i ~/.ssh/github_actions_deploy -p PORT USER@HOST
   ```

5. **Проверьте firewall на сервере**:
   ```bash
   # На сервере
   sudo ufw status
   # Если SSH порт закрыт:
   sudo ufw allow PORT/tcp
   ```

6. **Проверьте SSH сервис**:
   ```bash
   # На сервере
   sudo systemctl status ssh
   # Или для некоторых систем:
   sudo systemctl status sshd
   ```

7. **Проверьте логи SSH на сервере**:
   ```bash
   # На сервере
   sudo tail -f /var/log/auth.log
   # Или для некоторых систем:
   sudo tail -f /var/log/secure
   ```

8. **Убедитесь, что ключ без пароля**:
   - Если ключ защищен паролем, GitHub Actions не сможет его использовать
   - Создайте новый ключ без пароля: `ssh-keygen -t ed25519 -N ""`

#### Проблема: Ошибка "PROJECT_DIR is not set"

**Ошибка**: `❌ ERROR: PROJECT_DIR is not set`

**Решение**:
1. Убедитесь, что секрет `DEPLOY_PROJECT_PATH` установлен в GitHub Secrets
2. Используйте абсолютный путь (например, `/home/user/chatty`, а не `~/chatty`)
3. Проверьте, что путь существует на сервере

#### Проблема: Ошибка "Service 'server' not found in docker-compose.yml"

**Ошибка**: `❌ ERROR: Service 'server' not found in docker-compose.yml`

**Решение**:
1. Убедитесь, что файл `docker-compose.yml` существует в директории проекта
2. Проверьте, что сервис с нужным именем существует в `docker-compose.yml`
3. Если сервис называется по-другому, установите секрет `DEPLOY_SERVICE_NAME` с правильным именем

#### Проблема: Ошибка "no such service: server"

**Ошибка**: `no such service: server`

**Решение**:
1. Проверьте, что в `docker-compose.yml` есть сервис с именем, указанным в `DEPLOY_SERVICE_NAME` (по умолчанию `server`)
2. Убедитесь, что вы находитесь в правильной директории проекта
3. Проверьте синтаксис `docker-compose.yml`

#### Проблема: Контейнер не запускается после деплоя

**Решение**:
1. Проверьте логи: `docker logs chatty-server` (замените на имя вашего контейнера)
2. Убедитесь, что `server/.env` файл настроен правильно
3. Проверьте, что Docker сети созданы: `docker network ls`
4. Проверьте доступность образа: `docker images | grep chatty`
5. Проверьте, что переменная `DOCKER_IMAGE_SERVER` установлена в окружении перед запуском `docker compose`

#### Проблема: Health check не проходит

**Ошибка**: `❌ Server container failed to start or is not ready`

**Решение**:
1. Проверьте логи контейнера: `docker logs chatty-server --tail 100`
2. Убедитесь, что приложение запустилось и слушает на порту 3000
3. Проверьте, что порт 3000 проброшен в `docker-compose.yml`
4. Проверьте доступность приложения вручную: `curl http://localhost:3000/api/v1`
5. Убедитесь, что приложение полностью инициализировалось (может потребоваться больше времени)

#### Проблема: Запускается неправильный стек (project name)

**Ошибка**: Запускается стек с неправильным именем

**Решение**:
1. Установите секрет `DEPLOY_COMPOSE_PROJECT_NAME` с правильным именем стека
2. Или убедитесь, что вы находитесь в правильной директории проекта
3. Проверьте, какой project name использует docker compose: `docker compose ps`

#### Проблема: REGISTRY_URL пустая строка

**Ошибка**: `❌ ERROR: REGISTRY_URL is not set` или `REGISTRY_URL` пустая на удаленном сервере

**Решение**:
1. Убедитесь, что секрет `DOCKER_REGISTRY_URL` установлен в GitHub Secrets
2. Проверьте, что URL указан без протокола (без `https://` или `http://`)
3. Убедитесь, что URL не содержит пробелов или специальных символов
4. Проверьте логи GitHub Actions для отладки передачи переменных

### Мониторинг деплоев

Все деплои можно отслеживать в GitHub:
- Перейдите в репозиторий → **Actions**
- Выберите нужный workflow run
- Просмотрите логи каждого шага

## Структура деплоя

```
┌─────────────────────────────────────┐
│   atom-external-network             │
│   (внешняя сеть)                    │
│                                     │
│   ┌─────────────────────────────┐  │
│   │   chatty-server               │  │
│   │   (порт 3000)                 │  │
│   │   - Бэкенд (NestJS)           │  │
│   │   - Фронтенд (React)          │  │
│   └─────────────────────────────┘  │
└─────────────────────────────────────┘
              │
              │
┌─────────────────────────────────────┐
│   atom-internal-network             │
│   (внутренняя сеть)                 │
│                                     │
│   ┌─────────────────────────────┐  │
│   │   chatty-server               │  │
│   └─────────────────────────────┘  │
│              │                      │
│              ▼                      │
│   ┌─────────────────────────────┐  │
│   │   chatty-postgres            │  │
│   │   (порт 5432)                │  │
│   └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Особенности проекта Chatty

- **Монолитный образ**: Фронтенд и бэкенд собираются в один Docker образ
- **Статическая раздача**: Фронтенд раздаётся через `ServeStaticModule` в NestJS
- **API версионирование**: API использует версионирование `/api/v1`
- **WebSocket поддержка**: Приложение поддерживает WebSocket соединения для чата
- **JWT и API Key аутентификация**: Поддерживаются оба метода аутентификации


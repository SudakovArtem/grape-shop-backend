# Настройка деплоя проекта Grape Shop Backend

Этот документ содержит инструкции по настройке автоматического деплоя проекта на виртуальную машину с использованием GitHub Actions и Docker.

## Требования

- Виртуальная машина с установленной ОС Linux
- Docker и Docker Compose на VM
- SSH-доступ к VM
- Репозиторий проекта на GitHub
- Node.js версии 20 или выше (проект использует NestJS 11, который требует Node.js ≥ 20)

## Настройка на виртуальной машине

1. Установите Docker и Docker Compose на вашу VM:

```bash
# Установка Docker
# Установка Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Установка Docker и Docker Compose
sudo apt update
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt update
sudo apt install -y docker-ce

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Добавление текущего пользователя в группу docker
sudo usermod -aG docker $USER
```

2. Создайте директорию для проекта:

```bash
mkdir -p ~/grape-shop-backend
```

## Настройка GitHub Actions

1. В репозитории GitHub перейдите в раздел Settings > Secrets and variables > Actions
2. Добавьте следующие секреты:

- `VM_HOST` - IP-адрес или хост вашей VM
- `VM_USER` - имя пользователя для SSH-доступа к VM
- `SSH_PRIVATE_KEY` - приватный SSH-ключ для доступа к VM

- `DB_HOST` - хост базы данных PostgreSQL
- `DB_PORT` - порт базы данных PostgreSQL
- `DB_USER` - имя пользователя для базы данных
- `DB_PASSWORD` - пароль для базы данных
- `DB_NAME` - имя базы данных

- `JWT_SECRET` - секретный ключ для JWT-токенов
- `JWT_EXPIRATION_TIME` - время жизни JWT-токенов

- `AWS_S3_BUCKET_NAME` - имя бакета S3 для хранения файлов
- `AWS_REGION` - регион AWS
- `AWS_ACCESS_KEY_ID` - ID ключа доступа AWS
- `AWS_SECRET_ACCESS_KEY` - секретный ключ доступа AWS
- `AWS_S3_ENDPOINT_URL` - URL конечной точки S3

- `MAIL_TRANSPORT` - настройки транспорта для отправки почты
- `MAIL_FROM_NAME` - имя отправителя для писем

## Как работает автоматический деплой

1. При пуше в ветку `master` запускается GitHub Actions workflow.
2. Workflow запускает тесты и сборку проекта.
3. Если тесты проходят успешно, workflow подключается к вашей VM через SSH.
4. Файлы проекта и файл `.env` с переменными окружения копируются на VM.
5. На VM запускается Docker Compose, который собирает и запускает контейнеры.

## Ручной запуск деплоя

Вы можете запустить деплой вручную через GitHub Actions, перейдя на вкладку Actions в репозитории и выбрав workflow "CI/CD Pipeline", затем нажав "Run workflow".

## Проверка статуса деплоя

После деплоя вы можете проверить статус контейнеров на VM:

```bash
cd ~/grape-shop-backend
docker-compose ps
```

## Логи приложения

Для просмотра логов запущенного приложения:

```bash
cd ~/grape-shop-backend
docker-compose logs -f app
```

## Проверка версии Node.js

Перед деплоем рекомендуется проверить совместимость версии Node.js:

```bash
cd ~/grape-shop-backend
node -v  # Должно показать v20.x.x или выше
yarn check:version  # Запустит скрипт проверки совместимости
```

## Устранение неполадок

1. **Проблемы с подключением по SSH**:
   - Проверьте, что SSH-ключ добавлен в GitHub Secrets
   - Проверьте, что VM доступна и SSH-сервер запущен

2. **Проблемы с Docker**:
   - Проверьте логи Docker: `docker-compose logs`
   - Проверьте статус контейнеров: `docker-compose ps`

3. **Проблемы с переменными окружения**:
   - Проверьте наличие и корректность файла `.env` на VM
   - Проверьте, что все необходимые секреты добавлены в GitHub Secrets

4. **Проблемы с версией Node.js**:
   - Убедитесь, что используется Node.js версии 20 или выше
   - Запустите `yarn check:version` для проверки совместимости
   - При обновлении пакетов NestJS, проверьте их требования к версии Node.js

## Структура проекта для деплоя

- `docker-compose.yml` - конфигурация Docker Compose
- `Dockerfile` - инструкции для сборки Docker-образа (использует Node.js 20)
- `.github/workflows/ci-cd.yml` - конфигурация GitHub Actions
- `scripts/deploy.sh` - скрипт для деплоя на VM
- `scripts/check-version-compatibility.js` - скрипт для проверки совместимости версий
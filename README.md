# Grape Shop Backend

Бэкенд для сайта по продаже саженцев и черенков винограда.

## Описание

Этот проект представляет собой REST API для интернет-магазина, специализирующегося на продаже саженцев и черенков винограда. Реализован функционал каталога продуктов, управления пользователями (регистрация, авторизация, профиль, сброс пароля), корзины, оформления заказов и загрузки изображений продуктов.

## Технологический стек

- **Фреймворк:** [NestJS](https://nestjs.com/) (Node.js)
- **Язык:** TypeScript
- **База данных:** PostgreSQL
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Аутентификация:** JWT (JSON Web Tokens)
- **Отправка Email:** [SendGrid](https://sendgrid.com/)
- **Хранение файлов:** AWS S3
- **Валидация:** class-validator, class-transformer
- **Документация API:** Swagger (OpenAPI)
- **Rate Limiting:** @nestjs/throttler
- **Менеджер пакетов:** Yarn

## Установка и запуск

1.  **Клонируйте репозиторий** (если он размещен где-либо):

    ```bash
    git clone <your-repo-url>
    cd grape-shop-backend
    ```

2.  **Установите зависимости:**

    ```bash
    yarn install
    ```

3.  **Настройте переменные окружения:**

    - Создайте файл `.env` в корне проекта.
    - Скопируйте содержимое из `.env.example` (если он есть) или добавьте следующие переменные:

      ```env
      # Database Credentials
      DB_HOST=your_db_host
      DB_PORT=your_db_port
      DB_USER=your_db_username
      DB_PASSWORD=your_db_password
      DB_NAME=your_db_name

      # JWT
      JWT_SECRET=your_strong_jwt_secret_key
      JWT_EXPIRATION_TIME=3600

      # AWS Credentials
      AWS_S3_BUCKET_NAME=your_s3_bucket_name
      AWS_REGION=your_aws_region
      AWS_ACCESS_KEY_ID=your_access_key_id
      AWS_SECRET_ACCESS_KEY=your_secret_access_key
      AWS_S3_ENDPOINT_URL=https://s3.your_region.amazonaws.com
      STORAGE_PUBLIC_BASE_URL=https://your_storage_url

      # Mail config
      MAIL_TRANSPORT=smtp://<your_email>:<your_password>@smtp.<your_mail_provider>.com
      MAIL_FROM_NAME=<your_email_name>
      ```

    - Замените значения на ваши реальные данные.
    - Убедитесь, что ваша база данных PostgreSQL запущена и доступна.

4.  **Настройте конфигурацию Drizzle:**

    - Проверьте и при необходимости измените данные для подключения к БД в файле `drizzle.config.ts`.

5.  **Примените миграции базы данных:**

    - Сгенерируйте миграции (если схемы изменились и вы не делали этого ранее):
      ```bash
      yarn db:generate
      ```
    - Примените миграции к базе данных:
      ```bash
      yarn db:migrate
      ```

6.  **Запустите приложение в режиме разработки:**
    ```bash
    yarn start:dev
    ```
    Приложение будет доступно по адресу `http://localhost:3000` (или по порту, указанному в `PORT`).

## Документация API

Интерактивная документация API (Swagger UI) доступна по адресу `/api-docs` после запуска приложения.

Пример: `http://localhost:3000/api-docs`

Для доступа к защищенным эндпоинтам в Swagger UI используйте кнопку "Authorize" и вставьте ваш JWT Bearer токен в формате `Bearer <your_token>`.

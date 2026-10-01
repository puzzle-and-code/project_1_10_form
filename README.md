# Проект: Конструктор форм

## Сборка и запуск

Для тестировавния и демонстрации нужен только [Docker Desktop](https://docs.docker.com/get-docker/).
Команды ниже запускаются из корня репозитория. .NET SDK и Node.js для этого не нужны.
Порты те же, что уже используются в проекте: фронт `5173`, API `5080`, Postgres `5432`.

### Фронтенд

http://localhost:5173

```bash
docker compose -f frontend/react-app/docker-compose.yml up --build
```

Поднимается Vite с горячей перезагрузкой. База и бэкенд для этого не нужны.
Остановка: `Ctrl+C`.

### Бэкенд

http://localhost:5080  
Swagger: http://localhost:5080/swagger

```bash
docker compose -f backend/docker-compose.yml up --build
```

Остановка: `Ctrl+C`. Данные Postgres остаются в томе `auth_db_data`.



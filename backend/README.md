# Backend — Auth Service (скелет)

Solution разбит на 4 проекта по слоям чистой архитектуры:

```
backend/
├── AuthService.sln
└── src/
    ├── Api/              # входная точка, контроллеры, конфиги окружений
    ├── Application/       # use-case'ы, интерфейсы (пока пусто, растёт дальше)
    ├── Domain/             # сущности и бизнес-правила, ни от кого не зависит
    └── Infrastructure/     # EF Core, DbContext, миграции, репозитории
```

Зависимости идут внутрь: `Api → Infrastructure/Application → Domain`.
`Domain` не зависит ни от кого — это ядро чистой архитектуры.

## Требования

- .NET SDK (проверьте свою версию: `dotnet --list-sdks`; проекты
  таргетятся на `net8.0` — если у вас другая LTS-версия, поправьте
  `<TargetFramework>` во всех `.csproj`)
- PostgreSQL, локально или в Docker (проекты настроены на Npgsql;
  если база — MSSQL, замените пакет `Npgsql.EntityFrameworkCore.PostgreSQL`
  на `Microsoft.EntityFrameworkCore.SqlServer` в `Infrastructure.csproj`
  и `UseNpgsql(...)` на `UseSqlServer(...)` в двух местах:
  `Infrastructure/DependencyInjection.cs` и
  `Infrastructure/Persistence/AppDbContextFactory.cs`)
- `dotnet-ef` CLI (ставится один раз глобально, см. ниже)

## Локальный запуск (одной командой)

```bash
cd backend
docker compose up -d   # поднимет локальный Postgres (см. docker-compose.yml)
dotnet restore
dotnet run --project src/Api
```

Откроется на `http://localhost:5080`, Swagger — на `/swagger`
(доступен только в Development).

Если solution не собирается из-за .sln (например, IDE ругается на GUID'ы),
проще всего пересоздать его локально одной командой — это займёт 10 секунд:

```bash
dotnet new sln -n AuthService
dotnet sln add src/Api/Api.csproj src/Application/Application.csproj src/Domain/Domain.csproj src/Infrastructure/Infrastructure.csproj
```

## Окружения (dev/prod)

Переключаются переменной `ASPNETCORE_ENVIRONMENT` (`Development` /
`Production`). Локально при `dotnet run` она уже выставлена в
`Development` через `Api/Properties/launchSettings.json`.

- `appsettings.json` — общие настройки, безопасно коммитить
- `appsettings.Development.json` — настройки для разработки (более
  подробное логирование)
- `appsettings.Production.json` — настройки для продакшена (логирование
  потише)

**Строка подключения нигде не захардкожена и не закоммичена.** Задаётся:

- **Локально (dev)** — через user-secrets (не попадает в git):

  ```bash
  cd src/Api
  dotnet user-secrets init
  dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=auth_service_dev;Username=postgres;Password=postgres"
  ```

- **На сервере/в контейнере (prod)** — через переменную окружения
  (ASP.NET Core автоматически мапит `:` в `__`):

  ```bash
  export ConnectionStrings__DefaultConnection="Host=prod-db;Port=5432;Database=auth_service;Username=...;Password=..."
  ```

## Миграции (EF Core / dotnet-ef)

Инструмент ставится один раз на машину (не в проект):

```bash
dotnet tool install --global dotnet-ef
# уже стоит? тогда:
dotnet tool update --global dotnet-ef
```

Пакет `Microsoft.EntityFrameworkCore.Design` уже подключён к проекту
`Infrastructure` (см. `Infrastructure.csproj`) — это то, что нужно
для работы `dotnet ef` именно с этим проектом.

### Создать новую миграцию

Выполнять из папки `backend/`:

```bash
dotnet ef migrations add НазваниеМиграции \
  --project src/Infrastructure \
  --startup-project src/Api \
  --output-dir Migrations
```

- `--project` — где лежит `DbContext` (Infrastructure)
- `--startup-project` — откуда брать конфигурацию/DI (Api)

### Применить миграции к базе

```bash
dotnet ef database update \
  --project src/Infrastructure \
  --startup-project src/Api
```

### Автоприменение в dev

В `Api/Program.cs` при `app.Environment.IsDevelopment()` вызывается
`db.Database.Migrate()` — то есть локально при `dotnet run` миграции
применяются сами. В Production это намеренно выключено: там миграции
накатывают осознанно, отдельным шагом деплоя (`dotnet ef database update`),
а не при каждом рестарте контейнера.

### Проверка, что пайплайн реально работает

1. Поднимите пустую (чистую) базу.
2. `dotnet ef database update ...` (или просто `dotnet run` — накатится
   само в dev).
3. Откройте `GET /api/health/db` — эндпоинт пишет и читает тестовую
   строку через `HealthCheckPing` (см. `Domain/Entities/HealthCheckPing.cs`
   и `Infrastructure/Persistence/AppDbContext.cs`). Ответ вида
   `{ "status": "ok", "totalPings": 1, ... }` подтверждает, что
   миграция применилась и подключение к БД рабочее.

Эта тестовая таблица — временная, только чтобы доказать, что пайплайн
работает. Реальные доменные миграции (User, Organization/Form и т.д.)
появятся отдельной задачей.

### Откат миграции (если понадобится)

```bash
dotnet ef database update ИмяПредыдущейМиграции --project src/Infrastructure --startup-project src/Api
dotnet ef migrations remove --project src/Infrastructure --startup-project src/Api
```

## Секреты

Ничего чувствительного не коммитим: пароли/строки подключения — только
через `dotnet user-secrets` (dev) и переменные окружения (prod). См.
`.gitignore`.

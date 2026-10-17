using AuthService.Application.Common;
using AuthService.Infrastructure;
using AuthService.Infrastructure.Persistence;
using FormBuilderWithAnalytics.src.Application.Interfaces;
using FormBuilderWithAnalytics.src.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Npgsql;


var builder = WebApplication.CreateBuilder(args);

// Controllers и Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Регистрация сервисов
builder.Services.AddScoped<IAuthService,
    FormBuilderWithAnalytics.src.Infrastructure.Services.AuthService>();

builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();

// Регистрация слоёв приложения и инфраструктуры
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// Проверка строки подключения
var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Строка подключения 'DefaultConnection' не найдена. " +
        "Проверь appsettings.json и переменные окружения.");
}

var parsedConnection =
    new NpgsqlConnectionStringBuilder(connectionString);

Console.WriteLine($"PostgreSQL Host: {parsedConnection.Host}");
Console.WriteLine($"PostgreSQL Port: {parsedConnection.Port}");

var app = builder.Build();

// Swagger только в Development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// ВАЖНО: Маршрутизация должна быть объявлена перед MapControllers,
// чтобы Swagger корректно обнаружил все контроллеры и их эндпоинты.
app.UseRouting();

app.MapControllers();

// Проверка PostgreSQL и применение существующих миграций
await ApplyDatabaseMigrationsAsync(app);

app.Run();

static async Task ApplyDatabaseMigrationsAsync(WebApplication app)
{
    var logger = app.Services
        .GetRequiredService<ILogger<Program>>();

    const int maxAttempts = 10;
    var connected = false;

    await using var scope = app.Services.CreateAsyncScope();

    var db = scope.ServiceProvider
        .GetRequiredService<AppDbContext>();

    for (var attempt = 1; attempt <= maxAttempts; attempt++)
    {
        try
        {
            logger.LogInformation(
                "Проверка подключения к PostgreSQL: {Attempt}/{MaxAttempts}",
                attempt,
                maxAttempts);

            connected = await db.Database.CanConnectAsync();

            if (connected)
            {
                logger.LogInformation(
                    "Подключение к PostgreSQL успешно.");

                break;
            }

            logger.LogWarning(
                "PostgreSQL пока недоступен.");
        }
        catch (NpgsqlException ex)
        {
            logger.LogWarning(
                ex,
                "Ошибка подключения к PostgreSQL.");
        }
        catch (TimeoutException ex)
        {
            logger.LogWarning(
                ex,
                "Истекло время ожидания PostgreSQL.");
        }

        if (attempt < maxAttempts)
        {
            await Task.Delay(TimeSpan.FromSeconds(3));
        }
    }

    if (!connected)
    {
        throw new InvalidOperationException(
            "Не удалось подключиться к PostgreSQL. " +
            "Проверь адрес сервера, порт, имя базы, логин и пароль.");
    }

    // Показываем миграции, которые ещё не применены
    var pendingMigrations =
        (await db.Database.GetPendingMigrationsAsync()).ToList();

    if (pendingMigrations.Count == 0)
    {
        logger.LogInformation(
            "Нет ожидающих миграций.");
    }
    else
    {
        foreach (var migration in pendingMigrations)
        {
            logger.LogInformation(
                "Ожидает применения миграция: {Migration}",
                migration);
        }

        await db.Database.MigrateAsync();

        logger.LogInformation(
            "Миграции успешно применены.");
    }
}
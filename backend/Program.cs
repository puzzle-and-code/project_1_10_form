using AuthService.Application.Common;
using AuthService.Infrastructure;
using AuthService.Infrastructure.Persistence;
using FormBuilderWithAnalytics.src.Application.Interfaces;
using FormBuilderWithAnalytics.src.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// Регистрация auth из faabc1c (Add Registration and Endpoints):
// без неё AuthController есть в дереве, но не попадает в DI.
builder.Services.AddScoped<IAuthService, FormBuilderWithAnalytics.src.Infrastructure.Services.AuthService>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// --- Swagger/OpenAPI ---
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "FormBuilderWithAnalytics API",
        Version = "v1",
        Description = "API сервиса форм/опросов: health-эндпоинты и авторизация " +
                      "(register, login, logout, refresh)."
    });

    // Подхватываем XML-комментарии (///summary) из кода, чтобы в Swagger
    // были человекочитаемые описания эндпоинтов, а не только сигнатуры.
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

var app = builder.Build();

// Swagger и автоприменение миграций — только в Development.
// В Production миграции накатываются отдельно, не при рестарте контейнера.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "FormBuilderWithAnalytics API v1");
    });

    await ApplyDatabaseMigrationsAsync(app);
}

app.UseHttpsRedirection();
app.MapControllers();

app.Run();

static async Task ApplyDatabaseMigrationsAsync(WebApplication app)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    const int maxAttempts = 10;

    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    for (var attempt = 1; attempt <= maxAttempts; attempt++)
    {
        try
        {
            logger.LogInformation(
                "Проверка подключения к PostgreSQL: {Attempt}/{MaxAttempts}",
                attempt,
                maxAttempts);

            if (await db.Database.CanConnectAsync())
            {
                await db.Database.MigrateAsync();
                logger.LogInformation("Миграции применены.");
                return;
            }

            logger.LogWarning("PostgreSQL пока недоступен.");
        }
        catch (NpgsqlException ex)
        {
            logger.LogWarning(ex, "Ошибка подключения к PostgreSQL.");
        }
        catch (TimeoutException ex)
        {
            logger.LogWarning(ex, "Истекло время ожидания PostgreSQL.");
        }

        if (attempt < maxAttempts)
        {
            await Task.Delay(TimeSpan.FromSeconds(3));
        }
    }

    throw new InvalidOperationException(
        "Не удалось подключиться к PostgreSQL и применить миграции.");
}

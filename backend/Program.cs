using System.Text;
using AuthService.Application.Common;
using AuthService.Infrastructure;
using AuthService.Infrastructure.Persistence;
using FormBuilderWithAnalytics.src.Application.Interfaces;
using FormBuilderWithAnalytics.src.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// Регистрация auth из faabc1c (Add Registration and Endpoints):
// без неё AuthController есть в дереве, но не попадает в DI.
builder.Services.AddScoped<IAuthService, FormBuilderWithAnalytics.src.Infrastructure.Services.AuthService>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// JWT-аутентификация — проверяет access-токен, который выдаёт
// AuthController при /api/auth/login (см. JwtTokenService.GenerateAccessToken).
// Нужна для задачи с формами: [Authorize] на FormsController иначе
// падает при первом запросе с ошибкой "No authenticationScheme was specified" —
// до этой задачи в проекте не было ни одного защищённого эндпоинта.
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Не переименовываем стандартные claim'ы (например "sub" в
        // ClaimTypes.NameIdentifier) — в контроллерах читаем claim'ы
        // под теми же именами, под которыми их создаёт JwtTokenService.
        options.MapInboundClaims = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],

            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],

            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),

            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddAuthorization();

// --- Swagger/OpenAPI ---
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "FormBuilderWithAnalytics API",
        Version = "v1",
        Description = "API сервиса форм/опросов: health-эндпоинты, авторизация " +
                      "(register, login, logout, refresh) и формы (получение/обновление своих анкет)."
    });

    // Подхватываем XML-комментарии (///summary) из кода, чтобы в Swagger
    // были человекочитаемые описания эндпоинтов, а не только сигнатуры.
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }

    // Кнопка "Authorize" в Swagger UI — чтобы можно было вставить
    // access-токен (из /api/auth/login) и проверять защищённые
    // эндпоинты (например /api/forms/{id}) прямо из браузера.
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Вставьте access-токен, полученный от /api/auth/login (без слова 'Bearer', только сам токен)."
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
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

app.UseAuthentication();
app.UseAuthorization();

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

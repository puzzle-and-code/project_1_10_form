using AuthService.Application.Common;
using AuthService.Infrastructure;
using FormBuilderWithAnalytics.src.Application.Interfaces;
using FormBuilderWithAnalytics.src.Infrastructure.Services;

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

// Swagger доступен только в Development — в проде не выставляем схему API наружу.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "FormBuilderWithAnalytics API v1");
    });
}

app.UseHttpsRedirection();
app.MapControllers();

app.Run();

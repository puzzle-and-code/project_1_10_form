using AuthService.Application.Common;
using AuthService.Infrastructure;
using AuthService.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// builder.Environment.EnvironmentName переключается переменной окружения
// ASPNETCORE_ENVIRONMENT (Development / Production). От неё зависит,
// какой appsettings.{Environment}.json подхватится (это делает сам
// WebApplication.CreateBuilder — см. appsettings.*.json рядом).

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

// Автоприменение миграций при старте — только в Development.
// В Production миграции накатываются осознанно, отдельной командой/шагом
// в CI-CD (`dotnet ef database update`), а не при каждом рестарте контейнера.
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.MapControllers();

app.Run();

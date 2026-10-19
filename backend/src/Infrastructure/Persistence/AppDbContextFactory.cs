using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace AuthService.Infrastructure.Persistence;

/// <summary>
/// Нужен, чтобы команды `dotnet ef migrations add / database update`
/// работали, даже если запускать их из папки Infrastructure напрямую
/// (без --startup-project). EF Core находит этот класс через
/// IDesignTimeDbContextFactory<T> и создаёт DbContext "для дизайн-тайма",
/// не поднимая всё приложение и DI-контейнер Api.
///
/// Строку подключения он берёт из тех же источников, что и Api
/// (см. Api/Program.cs): appsettings*.json + переменные окружения +
/// user-secrets — секретов в коде нет.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";

        // Ищем конфигурацию в текущей директории или в корне проекта
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile($"appsettings.{environment}.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=auth_service_dev;Username=postgres;Password=postgres";

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new AppDbContext(optionsBuilder.Options);
    }
}

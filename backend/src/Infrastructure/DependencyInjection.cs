using AuthService.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AuthService.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "Connection string 'DefaultConnection' not found. " +
                "Set it via appsettings.{Environment}.json (local dev only, not committed with real creds), " +
                "environment variable ConnectionStrings__DefaultConnection, or dotnet user-secrets.");

        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

        // сюда позже: services.AddScoped<IUserRepository, EfUserRepository>(); и т.д.
        // (репозитории будут ходить через AppDbContext — весь доступ к данным на EF Core)

        return services;
    }
}

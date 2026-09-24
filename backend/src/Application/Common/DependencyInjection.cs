using Microsoft.Extensions.DependencyInjection;

namespace AuthService.Application.Common;

/// <summary>
/// Точка регистрации сервисов слоя Application (MediatR/handlers/валидаторы
/// и т.д. добавите сюда по мере роста проекта).
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // сюда позже: services.AddMediatR(...), AddValidatorsFromAssembly(...), и т.д.
        return services;
    }
}

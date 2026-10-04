using Microsoft.AspNetCore.Mvc;

namespace FormBuilderWithAnalytics.Controllers;

/// <summary>
/// Технические эндпоинты для проверки, что сервис поднят и отвечает.
/// Первые эндпоинты проекта — на них же обкатан Swagger/OpenAPI:
/// у каждого метода есть summary, описание и типы ответов,
/// чтобы в Swagger UI было понятно, что метод делает и что вернёт.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class HealthController : ControllerBase
{
    /// <summary>
    /// Проверка, что приложение запущено и отвечает на запросы.
    /// </summary>
    /// <returns>Статус сервиса и текущее время сервера (UTC).</returns>
    /// <response code="200">Сервис работает нормально.</response>
    [HttpGet]
    [ProducesResponseType(typeof(HealthResponse), StatusCodes.Status200OK)]
    public ActionResult<HealthResponse> Get()
    {
        return Ok(new HealthResponse("ok", DateTime.UtcNow));
    }

    /// <summary>
    /// Возвращает версию API — удобно для быстрой проверки, какая сборка задеплоена.
    /// </summary>
    /// <response code="200">Версия успешно возвращена.</response>
    [HttpGet("version")]
    [ProducesResponseType(typeof(VersionResponse), StatusCodes.Status200OK)]
    public ActionResult<VersionResponse> GetVersion()
    {
        var version = System.Reflection.Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "0.0.0";
        return Ok(new VersionResponse(version));
    }
}

/// <summary>Ответ health-проверки.</summary>
/// <param name="Status">Текстовый статус (сейчас всегда "ok").</param>
/// <param name="ServerTimeUtc">Текущее время сервера в UTC.</param>
public record HealthResponse(string Status, DateTime ServerTimeUtc);

/// <summary>Ответ с версией API.</summary>
/// <param name="Version">Версия сборки приложения.</param>
public record VersionResponse(string Version);

using AuthService.Domain.Entities;
using AuthService.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;

namespace AuthService.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _db;

    public HealthController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/health -> просто подтверждает, что приложение поднялось
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok" });

    // GET /api/health/db -> пишет и читает строку из БД,
    // чтобы наглядно проверить, что миграция реально применилась
    // и подключение к базе работает.
    [HttpGet("db")]
    public async Task<IActionResult> CheckDb()
    {
        var ping = new HealthCheckPing();
        _db.HealthCheckPings.Add(ping);
        await _db.SaveChangesAsync();

        var count = _db.HealthCheckPings.Count();
        return Ok(new { status = "ok", totalPings = count, lastId = ping.Id });
    }
}

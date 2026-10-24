using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AuthService.Infrastructure.Persistence;
using FormBuilderWithAnalytics.src.Application.DTOs;
using FormBuilderWithAnalytics.src.Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FormBuilderWithAnalytics.src.Api.Controllers;

/// <summary>
/// Эндпоинты для работы со своими анкетами (формами). Требуют
/// авторизации — заголовок "Authorization: Bearer {accessToken}"
/// (токен выдаёт POST /api/auth/login).
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
[Produces("application/json")]
public class FormsController : ControllerBase
{
    private readonly AppDbContext _context;

    public FormsController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Возвращает одну форму — только если она принадлежит текущему
    /// пользователю.
    /// </summary>
    /// <remarks>
    /// Если формы с таким Id нет ИЛИ она принадлежит другому
    /// пользователю — в обоих случаях 404, а не 403/401. Так мы не
    /// подтверждаем чужим пользователям, что форма с таким Id вообще
    /// существует.
    /// </remarks>
    /// <param name="id">Id формы.</param>
    /// <response code="200">Форма найдена и принадлежит текущему пользователю.</response>
    /// <response code="401">Не передан или недействителен access-токен.</response>
    /// <response code="404">Формы с таким Id нет, либо она принадлежит другому пользователю.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(FormResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FormResponseDto>> GetById(Guid id)
    {
        var userId = GetCurrentUserId();

        var form = await _context.Forms
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.id == id && f.owner_id == userId);

        if (form == null)
        {
            return NotFound();
        }

        return Ok(ToDto(form));
    }

    /// <summary>
    /// Обновляет название и/или описание своей формы.
    /// </summary>
    /// <remarks>
    /// Частичное обновление: меняются только поля, реально переданные
    /// в теле запроса (см. UpdateFormDto). Доступ к чужой форме или
    /// несуществующему Id — тоже 404, как и у GET.
    /// </remarks>
    /// <param name="id">Id формы.</param>
    /// <param name="dto">Новое название и/или описание.</param>
    /// <response code="200">Форма обновлена, возвращена актуальная версия.</response>
    /// <response code="400">Переданные значения не прошли валидацию.</response>
    /// <response code="401">Не передан или недействителен access-токен.</response>
    /// <response code="404">Формы с таким Id нет, либо она принадлежит другому пользователю.</response>
    [HttpPatch("{id:guid}")]
    [ProducesResponseType(typeof(FormResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FormResponseDto>> Patch(Guid id, [FromBody] UpdateFormDto dto)
    {
        var userId = GetCurrentUserId();

        var form = await _context.Forms
            .FirstOrDefaultAsync(f => f.id == id && f.owner_id == userId);

        if (form == null)
        {
            return NotFound();
        }

        if (dto.Title != null)
        {
            form.title = dto.Title;
        }

        if (dto.Description != null)
        {
            form.description = dto.Description;
        }

        form.updated_at = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(ToDto(form));
    }

    private Guid GetCurrentUserId()
    {
        // Access-токен подписывается с claim'ом "sub" = user.id (см.
        // JwtTokenService.GenerateAccessToken). В Program.cs включена
        // MapInboundClaims = false, поэтому claim читаем под тем же
        // именем, под которым он был выпущен, без автопереименования
        // ASP.NET Core в ClaimTypes.NameIdentifier.
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        // [Authorize] уже гарантирует, что токен валиден и claim есть —
        // но на случай токена без ожидаемого claim'а лучше явная ошибка,
        // чем NullReferenceException глубже в коде.
        if (sub == null || !Guid.TryParse(sub, out var userId))
        {
            throw new InvalidOperationException(
                "В access-токене отсутствует или повреждён claim 'sub' (id пользователя).");
        }

        return userId;
    }

    private static FormResponseDto ToDto(Form form) => new()
    {
        Id = form.id,
        Title = form.title,
        Description = form.description,
        CreatedAt = form.created_at,
        UpdatedAt = form.updated_at
    };
}

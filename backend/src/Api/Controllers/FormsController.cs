using System.Security.Claims;
using FormBuilderWithAnalytics.src.Application.DTOs;
using FormBuilderWithAnalytics.src.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FormBuilderWithAnalytics.src.Api.Controllers;

/// <summary>
/// Частичное обновление своей формы. Получение формы — GET в
/// CreationFormsController (тот же маршрут api/forms/{id}): форма
/// отдаётся только владельцу, иначе 404.
/// </summary>
[ApiController]
[Route("api/forms")]
[Authorize]
[Produces("application/json")]
public class FormsController : ControllerBase
{
    private readonly IFormsService _formsService;

    public FormsController(IFormsService formsService)
    {
        _formsService = formsService;
    }

    /// <summary>
    /// Обновляет название и/или описание своей формы.
    /// </summary>
    /// <remarks>
    /// Меняются только поля, переданные в теле запроса. Чужая форма
    /// и несуществующий id отвечают 404, как и GET.
    /// </remarks>
    /// <response code="200">Форма обновлена.</response>
    /// <response code="400">Значения не прошли валидацию.</response>
    /// <response code="401">Нет или недействителен access-токен.</response>
    /// <response code="404">Формы нет, либо она принадлежит другому пользователю.</response>
    [HttpPatch("{id:guid}")]
    [ProducesResponseType(typeof(FormDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Patch(Guid id, [FromBody] UpdateFormDto dto)
    {
        var userClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? User.FindFirstValue("sub");

        if (userClaim == null || !Guid.TryParse(userClaim, out var ownerId))
        {
            return Unauthorized(new { message = "Не удалось определить ID пользователя из токена." });
        }

        var updated = await _formsService.UpdateFormAsync(id, ownerId, dto);
        if (updated == null)
        {
            return NotFound();
        }

        return Ok(updated);
    }
}

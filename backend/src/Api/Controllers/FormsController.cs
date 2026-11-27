using System.Security.Claims;
using FormBuilderWithAnalytics.src.Application.DTOs;
using FormBuilderWithAnalytics.src.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FormBuilderWithAnalytics.src.Api.Controllers;

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

    [HttpGet("{id:guid}/public")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PublicFormDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPublic(Guid id)
    {
        var form = await _formsService.GetPublicFormAsync(id);
        if (form == null)
        {
            return NotFound();
        }

        return Ok(form);
    }

    [HttpPost("{id:guid}/responses")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(CreateResponseResultDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SubmitResponse(Guid id, [FromBody] List<SubmitAnswerItemDto> answers)
    {
        var result = await _formsService.SubmitResponseAsync(id, answers);

        if (result.IsNotFound)
        {
            return NotFound(new { message = result.ErrorMessage });
        }

        if (result.IsBadRequest)
        {
            return BadRequest(new { message = result.ErrorMessage });
        }

        return CreatedAtAction(nameof(GetPublic), new { id }, result.Data);
    }
}
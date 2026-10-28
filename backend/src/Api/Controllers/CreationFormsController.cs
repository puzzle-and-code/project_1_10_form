using FormBuilderWithAnalytics.src.Application.DTOs;
using FormBuilderWithAnalytics.src.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FormBuilderWithAnalytics.src.Api.Controllers
{
    [ApiController]
    [Route("api/forms")]
    [Authorize]
    public class CreationFormsController : ControllerBase
        {
            private readonly IFormsService _formsService;

            public CreationFormsController(IFormsService formsService)
            {
                _formsService = formsService;
            }

            // POST: api/CreationForms/draft
            [HttpPost("draft")]
            public async Task<IActionResult> CreateDraft([FromBody] FormDto formDto)
            {
                try
                {
                    // 1. Достаем ID пользователя из JWT-токена
                    var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                                      ?? User.FindFirstValue("sub");

                    if (userIdClaim == null || !Guid.TryParse(userIdClaim, out Guid ownerId))
                    {
                        return Unauthorized(new { message = "Не удалось определить ID пользователя из токена." });
                    }

                    // 2. Создаем черновик, передавая ID
                    var formId = await _formsService.CreateDraftAsync(formDto, ownerId);

                    return Ok(new { Message = "Черновик успешно создан", FormId = formId });
                }
                catch (Exception ex)
                {
                    var innerMessage = ex.InnerException?.Message ?? ex.Message;
                    return BadRequest(new { Error = innerMessage });
                }
            }

            [HttpGet]
            public async Task<IActionResult> GetMyForms()
            {
                // 1. Достаем ID пользователя из Claims текущего JWT токена
                var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                                  ?? User.FindFirstValue("sub"); // На случай, если ключом записан "sub"

                if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
                {
                    return Unauthorized(new { message = "Не удалось определить ID пользователя из токена." });
                }

                // 2. Запрашиваем формы у сервиса
                var forms = await _formsService.GetUserFormsAsync(userId);

                // 3. Возвращаем результат
                return Ok(forms);
            }
        }
}

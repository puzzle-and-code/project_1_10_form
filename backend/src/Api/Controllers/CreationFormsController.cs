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

            [HttpGet("{id}")]
            public async Task<IActionResult> GetFormById(Guid id)
            {
                // 1. Достаем ID пользователя из JWT-токена
                var userClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                                ?? User.FindFirstValue("sub");

                if (userClaim == null || !Guid.TryParse(userClaim, out var ownerId))
                {
                    return Unauthorized(new { message = "Не удалось определить ID пользователя из токена." });
                }

                try
                {
                    // 2. Запрашиваем форму с вопросами и вариантами через сервис
                   
                    var formDto = await _formsService.GetFormWithQuestionsAsync(id, ownerId);

                    if (formDto == null)
                    {
                      
                        return NotFound(new { message = "Форма не найдена." });
                    }

                    return Ok(formDto);
                }
                catch (Exception ex)
                {
                    var innerMessage = ex.InnerException?.Message ?? ex.Message;
                    return BadRequest(new { Error = innerMessage });
                }
            }
    }
}

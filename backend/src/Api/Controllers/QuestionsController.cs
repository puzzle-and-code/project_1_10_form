using System.Security.Claims;
using FormBuilderWithAnalytics.src.Application.DTOs;
using FormBuilderWithAnalytics.src.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FormBuilderWithAnalytics.src.Api.Controllers;

/// <summary>
/// Вопросы своей формы. Требуется заголовок
/// "Authorization: Bearer {accessToken}" (токен выдаёт POST /api/auth/login).
/// </summary>
[ApiController]
[Route("api/forms/{id:guid}/questions")]
[Authorize]
[Produces("application/json")]
public class QuestionsController : ControllerBase
{
    private readonly IQuestionsService _questionsService;

    public QuestionsController(IQuestionsService questionsService)
    {
        _questionsService = questionsService;
    }

    /// <summary>
    /// Создаёт один вопрос в своей форме.
    /// </summary>
    /// <remarks>
    /// Новый вопрос получает sortOrder в конец списка неудалённых вопросов
    /// формы, поэтому в GET /api/forms/{id} он виден последним.
    /// Тип вопроса после создания не меняется: чтобы сменить тип, вопрос
    /// удаляют и создают заново.
    ///
    /// Пример тела:
    ///
    ///     {
    ///       "text": "Какой цвет вам нравится?",
    ///       "type": "single_choice",
    ///       "isRequired": true,
    ///       "options": [ { "text": "Красный" }, { "text": "Синий" } ]
    ///     }
    ///
    /// Правила:
    /// - text — обязателен, после удаления пробелов по краям от 1 до 1500 символов;
    /// - type — short_text, number, single_choice или multi_choice;
    /// - isRequired — если не передан, сохраняется true;
    /// - options — для short_text и number не передаются (пустой массив или
    ///   отсутствие поля); для single_choice и multi_choice от 2 до 20
    ///   вариантов, текст каждого от 1 до 200 символов.
    /// </remarks>
    /// <param name="id">Id формы.</param>
    /// <param name="dto">Данные нового вопроса.</param>
    /// <response code="201">Вопрос создан и возвращён: id, type, isRequired, sortOrder и варианты.</response>
    /// <response code="400">Данные не прошли проверку; в ответе сообщения по полям, вопрос не создан.</response>
    /// <response code="401">Нет или недействителен access-токен.</response>
    /// <response code="404">Формы нет, она удалена или принадлежит другому пользователю.</response>
    /// <response code="409">Форма завершена (closed) — добавлять вопросы нельзя, вопрос не создан.</response>
    [HttpPost]
    [ProducesResponseType(typeof(QuestionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(Guid id, [FromBody] CreateQuestionDto dto)
    {
        var userClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? User.FindFirstValue("sub");

        if (userClaim == null || !Guid.TryParse(userClaim, out var ownerId))
        {
            return Unauthorized(new { message = "Не удалось определить ID пользователя из токена." });
        }

        var result = await _questionsService.AddQuestionAsync(id, ownerId, dto);

        switch (result.Status)
        {
            case AddQuestionStatus.FormNotFound:
                return NotFound(new { message = "Форма не найдена." });

            case AddQuestionStatus.FormClosed:
                return Conflict(new { message = "Форма завершена, добавлять вопросы нельзя." });

            default:
                // Location указывает на форму: вопрос читается через GET /api/forms/{id}.
                return Created($"/api/forms/{id}", result.Question);
        }
    }
}

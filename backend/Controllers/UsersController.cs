using FormBuilderWithAnalytics.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace FormBuilderWithAnalytics.Controllers;

/// <summary>
/// Эндпоинты пользователя. На этом этапе — только проверка входящих
/// данных (валидация), без сохранения в БД: сущность User и миграции
/// для неё появятся отдельной задачей (см.
/// src/Domain/Entities/_NextUp_AuthSketch.md).
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class UsersController : ControllerBase
{
    /// <summary>
    /// Регистрирует пользователя — но сначала проверяет корректность
    /// входных данных (email должен соответствовать маске
    /// "имя@домен.зона", пароль — не короче 8 символов).
    /// </summary>
    /// <remarks>
    /// Проверка срабатывает автоматически: атрибут [ApiController] на
    /// контроллере включает проверку ModelState до вызова метода, так
    /// что некорректные данные (битый email, короткий пароль, пустые
    /// поля) отсеиваются ещё на входе и клиент получает 400 с понятным
    /// списком ошибок по каждому полю, не доходя до бизнес-логики.
    /// </remarks>
    /// <param name="request">Email и пароль для регистрации.</param>
    /// <response code="201">Данные прошли валидацию.</response>
    /// <response code="400">
    /// Один или несколько параметров не прошли проверку (неверный формат
    /// email, слишком короткий пароль, пустое поле и т.д.) — тело ответа
    /// содержит список ошибок по каждому полю.
    /// </response>
    [HttpPost("register")]
    [ProducesResponseType(typeof(RegisterUserResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public ActionResult<RegisterUserResponse> Register([FromBody] RegisterUserRequest request)
    {
        // До этой строки код не дойдёт, если request не прошёл валидацию —
        // [ApiController] сам вернёт 400 с ValidationProblemDetails.
        // Сохранения в БД пока нет (см. summary класса), поэтому просто
        // подтверждаем, что данные корректны, и возвращаем временный Id.
        var response = new RegisterUserResponse(Guid.NewGuid(), request.Email);

        return StatusCode(StatusCodes.Status201Created, response);
    }
}

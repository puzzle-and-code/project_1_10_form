using System.ComponentModel.DataAnnotations;

namespace FormBuilderWithAnalytics.Contracts;

/// <summary>
/// Входные данные регистрации пользователя. ASP.NET Core проверяет эти
/// атрибуты автоматически при привязке модели (благодаря [ApiController]
/// на контроллере) — если что-то не прошло валидацию, запрос даже не
/// дойдёт до тела метода: клиенту сразу вернётся 400 Bad Request со
/// списком ошибок по каждому полю.
///
/// Пока нет сущности User/БД (это следующая задача — см.
/// src/Domain/Entities/_NextUp_AuthSketch.md), поля ограничены общими:
/// email и пароль. ФИО/возраст (физлицо) и название/описание
/// (организация) добавятся сюда же, когда появится реальная модель
/// аккаунта.
/// </summary>
public class RegisterUserRequest
{
    /// <summary>
    /// Email в формате имя@домен.зона (например, user@example.com).
    /// </summary>
    /// <example>user@example.com</example>
    [Required(ErrorMessage = "Email обязателен")]
    [StringLength(254, ErrorMessage = "Email не должен превышать 254 символа")]
    // Явная маска вида "_@_._" из задачи: что-то, собака, что-то, точка,
    // что-то — без пробелов и без второй "@". Встроенный [EmailAddress]
    // в ASP.NET Core слишком мягкий (пропускает "a@b" без точки и домена),
    // поэтому проверяем регуляркой с понятным сообщением об ошибке.
    [RegularExpression(
        @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        ErrorMessage = "Email должен быть в формате имя@домен.зона")]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Пароль, минимум 8 символов.
    /// </summary>
    [Required(ErrorMessage = "Пароль обязателен")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Пароль должен быть не короче 8 символов")]
    public string Password { get; set; } = string.Empty;
}

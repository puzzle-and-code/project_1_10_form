using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace FormBuilderWithAnalytics.src.Application.DTOs
{
    /// <summary>
    /// Данные для регистрации. Корректность полей проверяется автоматически
    /// ещё до вызова метода контроллера ([ApiController]): если что-то не
    /// прошло валидацию, клиент сразу получает 400 со списком ошибок по полям.
    /// </summary>
    public class RegisterDto
    {
        /// <summary>
        /// Email в формате имя@домен.зона (например, user@example.com).
        /// </summary>
        [JsonPropertyName("email")]
        [Required(ErrorMessage = "Email обязателен")]
        [StringLength(255, ErrorMessage = "Email не должен превышать 255 символов")]
        // Маска "_@_._": что-то, "@", что-то, точка, что-то — без пробелов
        // и без второй "@". Встроенный [EmailAddress] слишком мягкий
        // (пропускает "a@b" без точки), поэтому явная регулярка.
        [RegularExpression(
            @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
            ErrorMessage = "Email должен быть в формате имя@домен.зона")]
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Пароль, от 8 до 72 символов (72 — предел, который учитывает BCrypt).
        /// </summary>
        [JsonPropertyName("password")]
        [Required(ErrorMessage = "Пароль обязателен")]
        [StringLength(72, MinimumLength = 8, ErrorMessage = "Пароль должен быть от 8 до 72 символов")]
        public string Password { get; set; } = string.Empty;

        /// <summary>
        /// Имя для шапки. Лимит 100 символов совпадает с колонкой
        /// display_name в таблице users.
        /// </summary>
        [JsonPropertyName("display_name")]
        [Required(ErrorMessage = "Имя обязательно")]
        [StringLength(100, ErrorMessage = "Имя не должно превышать 100 символов")]
        public string DisplayName { get; set; } = string.Empty;
    }
}

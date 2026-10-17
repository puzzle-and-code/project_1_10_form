using System.ComponentModel.DataAnnotations;

namespace FormBuilderWithAnalytics.src.Application.DTOs
{
    // 2. Для логина (нужны только email и пароль)
    public class LoginDto
    {
        [Required]
        public string Email { get; set; }

        [Required]
        public string Password { get; set; }
    }
}

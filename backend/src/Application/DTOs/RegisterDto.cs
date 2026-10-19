using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace FormBuilderWithAnalytics.src.Application.DTOs
{
    public class RegisterDto
    {
        [JsonPropertyName("email")]
        public string Email { get; set; }

        [JsonPropertyName("password")]
        public string Password { get; set; }

        [JsonPropertyName("display_name")]
        public string DisplayName { get; set; }
    }
}

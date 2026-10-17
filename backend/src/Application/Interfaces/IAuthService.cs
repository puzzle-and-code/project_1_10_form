using FormBuilderWithAnalytics.src.Application.DTOs;

namespace FormBuilderWithAnalytics.src.Application.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
        Task<AuthResponseDto> LoginAsync(LoginDto dto);
        Task LogoutAsync(string refreshToken);
        Task<AuthResponseDto> RefreshTokenAsync(string refreshToken);
    }
}

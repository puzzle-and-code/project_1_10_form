using FormBuilderWithAnalytics.src.Domain.Models;

namespace FormBuilderWithAnalytics.src.Application.Interfaces
{
    public interface IJwtTokenService
    {
        string GenerateAccessToken(User user);
        string GenerateRefreshToken();
    }
}

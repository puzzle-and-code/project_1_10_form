using System.Security.Cryptography;
using System.Text;
using AuthService.Infrastructure.Persistence;
using BCrypt.Net;
using FormBuilderWithAnalytics.src.Application.DTOs;
using FormBuilderWithAnalytics.src.Application.Interfaces;
using FormBuilderWithAnalytics.src.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace FormBuilderWithAnalytics.src.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthService(AppDbContext context, IJwtTokenService jwtTokenService)
    {
        _context = context;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        var existingUser = await _context.Users
            .FirstOrDefaultAsync(u => u.email == dto.Email);

        if (existingUser != null)
        {
            throw new InvalidOperationException("Пользователь с таким email уже зарегистрирован.");
        }

        string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

        var user = new User
        {
            email = dto.Email,
            password_hash = passwordHash,
            display_name = dto.DisplayName,
            created_at = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var accessToken = _jwtTokenService.GenerateAccessToken(user);
        var refreshToken = _jwtTokenService.GenerateRefreshToken();

        await SaveRefreshTokenAsync(user.id, refreshToken);

        return new AuthResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            User = MapUser(user)
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrEmpty(dto.Password))
        {
            throw new UnauthorizedAccessException("Неверный email или пароль");
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.email == dto.Email);

        if (user == null)
        {
            throw new UnauthorizedAccessException("Неверный email или пароль");
        }

        bool isPasswordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.password_hash);
        if (!isPasswordValid)
        {
            throw new UnauthorizedAccessException("Неверный email или пароль");
        }

        var accessToken = _jwtTokenService.GenerateAccessToken(user);
        var refreshToken = _jwtTokenService.GenerateRefreshToken();

        await SaveRefreshTokenAsync(user.id, refreshToken);

        return new AuthResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            User = MapUser(user)
        };
    }

    public async Task LogoutAsync(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return;
        }

        var tokenHash = HashToken(refreshToken);
        var storedToken = await _context.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash);

        if (storedToken != null && storedToken.RevokedAt == null)
        {
            storedToken.RevokedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<AuthResponseDto> RefreshTokenAsync(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            throw new UnauthorizedAccessException("Недействительный или истекший refresh token.");
        }

        var tokenHash = HashToken(refreshToken);

        var storedToken = await _context.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash);

        if (storedToken == null || storedToken.RevokedAt != null || storedToken.ExpiresAt <= DateTime.UtcNow)
        {
            throw new UnauthorizedAccessException("Недействительный или истекший refresh token.");
        }

        // Ротация: помечаем старый refresh-токен отозванным
        storedToken.RevokedAt = DateTime.UtcNow;

        var newAccessToken = _jwtTokenService.GenerateAccessToken(storedToken.User);
        var newRefreshToken = _jwtTokenService.GenerateRefreshToken();

        await SaveRefreshTokenAsync(storedToken.UserId, newRefreshToken);
        await _context.SaveChangesAsync();

        return new AuthResponseDto
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken,
            User = MapUser(storedToken.User)
        };
    }

    private async Task SaveRefreshTokenAsync(Guid userId, string refreshToken)
    {
        var now = DateTime.UtcNow;
        var entity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = HashToken(refreshToken),
            CreatedAt = now,
            ExpiresAt = now.AddDays(7),
            RevokedAt = null
        };

        _context.RefreshTokens.Add(entity);
        await _context.SaveChangesAsync();
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static UserDto MapUser(User user) => new()
    {
        Id = user.id,
        Email = user.email,
        DisplayName = user.display_name
    };
}
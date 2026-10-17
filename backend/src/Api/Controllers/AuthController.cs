using FormBuilderWithAnalytics.src.Application.DTOs;
using FormBuilderWithAnalytics.src.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;


[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService; 

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    // 1. Эндпоинт для регистрации нового пользователя
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        
        var result = await _authService.RegisterAsync(model);
        if (result == null)
            return BadRequest(new { message = "Пользователь с таким email уже существует." });

        return Ok(new { message = "Регистрация прошла успешно!" });
    }

    // 2. Эндпоинт для авторизации (логина) пользователя
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var result = await _authService.LoginAsync(dto); // Проверяет пароль, создает accessToken и refreshToken

        // Упаковываем Refresh Token в HttpOnly Cookie
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = false, 
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth", 
            Expires = DateTime.UtcNow.AddDays(7) 
        };

        Response.Cookies.Append("refreshToken", result.RefreshToken, cookieOptions);

        // Возвращаем accessToken и данные пользователя в JSON
        return Ok(new
        {
            accessToken = result.AccessToken,
            user = result.User
        });
    }

    // 3. Эндпоинт для завершения сессии (логаут)
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        if (Request.Cookies.TryGetValue("refreshToken", out var refreshToken))
        {
            await _authService.LogoutAsync(refreshToken); // Удаляем из базы
        }

        // Стираем куку на клиенте
        Response.Cookies.Delete("refreshToken", new CookieOptions
        {
            Path = "/api/auth",
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax
        });

        return Ok(new { message = "Logged out successfully" });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        // Читаем рефреш токен из куки
        if (!Request.Cookies.TryGetValue("refreshToken", out var refreshToken))
        {
            return Unauthorized(new { message = "Refresh token is missing" });
        }

        var result = await _authService.RefreshTokenAsync(refreshToken); // Проверяет токен в базе/ротирует

        // Записываем новый Refresh Token в куку (перезаписываем старый)
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = false,
            SameSite = SameSiteMode.Lax,
            Path = "/",    
            Expires = DateTime.UtcNow.AddDays(7)
        };

        Response.Cookies.Append("refreshToken", result.RefreshToken, cookieOptions);

        return Ok(new
        {
            accessToken = result.AccessToken,
            user = result.User
        });
    }
}

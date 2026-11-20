using FormBuilderWithAnalytics.src.Application.DTOs;
using FormBuilderWithAnalytics.src.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;


[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private const string RefreshCookieName = "refreshToken";
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto model)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            await _authService.RegisterAsync(model);
            return Ok(new { message = "Регистрация прошла успешно!" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message, code = "USER_ALREADY_EXISTS" });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (!ModelState.IsValid)
        {
            return Unauthorized(new
            {
                message = "Неверный email или пароль",
                code = "INVALID_CREDENTIALS"
            });
        }

        try
        {
            var result = await _authService.LoginAsync(dto);

            SetRefreshCookie(result.RefreshToken);

            return Ok(new
            {
                accessToken = result.AccessToken,
                user = result.User
            });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(new
            {
                message = "Неверный email или пароль",
                code = "INVALID_CREDENTIALS"
            });
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        if (Request.Cookies.TryGetValue(RefreshCookieName, out var refreshToken) && !string.IsNullOrWhiteSpace(refreshToken))
        {
            await _authService.LogoutAsync(refreshToken);
        }

        Response.Cookies.Delete(RefreshCookieName, CreateCookieOptions(DateTime.UtcNow.AddDays(-1)));

        return Ok(new { message = "Logged out successfully" });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        if (!Request.Cookies.TryGetValue(RefreshCookieName, out var refreshToken) || string.IsNullOrWhiteSpace(refreshToken))
        {
            return Unauthorized(new
            {
                message = "Refresh token отсутствует.",
                code = "REFRESH_TOKEN_MISSING"
            });
        }

        try
        {
            var result = await _authService.RefreshTokenAsync(refreshToken);

            SetRefreshCookie(result.RefreshToken);

            return Ok(new
            {
                accessToken = result.AccessToken,
                user = result.User
            });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(new
            {
                message = "Недействительный или истекший refresh token.",
                code = "INVALID_REFRESH_TOKEN"
            });
        }
    }

    private void SetRefreshCookie(string refreshToken)
    {
        Response.Cookies.Append(
            RefreshCookieName,
            refreshToken,
            CreateCookieOptions(DateTime.UtcNow.AddDays(7))
        );
    }

    private CookieOptions CreateCookieOptions(DateTime expiresUtc)
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/api/auth",
            Expires = expiresUtc
        };
    }
}

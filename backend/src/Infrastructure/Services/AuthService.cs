using AuthService.Infrastructure.Persistence;
using FormBuilderWithAnalytics.src.Application.DTOs;
using FormBuilderWithAnalytics.src.Domain.Models;
using BCrypt.Net;
using FormBuilderWithAnalytics.src.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FormBuilderWithAnalytics.src.Infrastructure.Services
{
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
            // 1. Проверяем, существует ли уже пользователь с таким email
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.email == dto.Email);

            if (existingUser != null)
            {
                throw new Exception("Пользователь с таким email уже зарегистрирован.");
            }

            // 2. ХЕШИРОВАНИЕ ПАРОЛЯ с помощью BCrypt
            // Этот метод генерирует безопасную соль и хэширует пароль
            string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            // 3. Создаем объект пользователя (модель, которую ты создал)
            var user = new User
            {
                email = dto.Email,
                password_hash = passwordHash, // Сохраняем хэш пароля
                display_name = dto.DisplayName, // <-- Вот здесь мы передаем имя пользователя из DTO!
                created_at = DateTime.UtcNow
            };

            // 4. Сохраняем в базу данных
            _context.Users.Add(user);
            await _context.SaveChangesAsync(); // После этого у user появится сгенерированный Id

            // 5. Генерируем токены (JWT + сессия)
            var accessToken = _jwtTokenService.GenerateAccessToken(user);
            var refreshToken = _jwtTokenService.GenerateRefreshToken();

            // (Здесь также можно сохранить сессию/рефреш-токен в таблицу UserSessions, как мы обсуждали ранее)

            // 6. Возвращаем клиенту результат
            return new AuthResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                User = new UserDto
                {
                    Id = user.id,
                    Email = user.email,
                    DisplayName = user.display_name
                }
            };
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
        {
            // 1. Ищем пользователя по email (учитывая твои названия полей в модели: u.email)
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.email == dto.Email);

            if (user == null)
            {
                throw new UnauthorizedAccessException("Неверный email или пароль.");
            }

            // 2. Проверяем правильность пароля через BCrypt
            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.password_hash);

            if (!isPasswordValid)
            {
                throw new UnauthorizedAccessException("Неверный email или пароль.");
            }

            // 3. Генерируем новые токены
            var accessToken = _jwtTokenService.GenerateAccessToken(user);
            var refreshToken = _jwtTokenService.GenerateRefreshToken();

            // (Опционально) Здесь можно сохранить refreshToken в таблицу сессий пользователя, 
            // чтобы потом можно было делать Refresh Token или Logout.

            // 4. Возвращаем результат
            return new AuthResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                User = new UserDto
                {
                    Id = user.id,
                    Email = user.email,
                    DisplayName = user.display_name
                }
            };
        }

        public async Task LogoutAsync(string refreshToken)
        {
           

            await Task.CompletedTask;
        }

        public async Task<AuthResponseDto> RefreshTokenAsync(string refreshToken)
        {
            // 1. Здесь проверяется валидность рефреш-токена (например, ищется в таблице сессий в базе данных)
            // var session = await _context.UserSessions.Include(s => s.User).FirstOrDefaultAsync(s => s.RefreshToken == refreshToken);
            // if (session == null || session.ExpiresAt < DateTime.UtcNow) throw new UnauthorizedAccessException("Недействительный рефреш токен.");

           

            throw new NotImplementedException("логика проверки и ротации рефреш-токена из базы данных.");
        }
    }
}

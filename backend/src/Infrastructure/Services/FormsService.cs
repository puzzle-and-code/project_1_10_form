using AuthService.Infrastructure.Persistence;
using FormBuilderWithAnalytics.src.Application.DTOs;
using FormBuilderWithAnalytics.src.Application.Interfaces;
using FormBuilderWithAnalytics.src.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace FormBuilderWithAnalytics.src.Infrastructure.Services
{
    public class FormsService: IFormsService
    {
        private readonly AppDbContext _context;

        public FormsService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Guid> CreateDraftAsync(FormDto formDto, Guid ownerId) // Создаем черновик формы
        {
            var form = new Form
            {
                OwnerId = ownerId, // Приводим к camelCase/PascalCase вашей модели Form
                Title = formDto.Title ?? "Без названия",
                Description = formDto.Description ?? string.Empty,
                Status = "draft", // Соответствует спецификации с маленькой буквы ("draft")
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Forms.Add(form);
            await _context.SaveChangesAsync();

            return form.Id; // Возвращает Guid созданной формы
        }

        public async Task<IEnumerable<FormDto>> GetUserFormsAsync(Guid userId)
        {
            // Получаем все формы конкретного пользователя (включая черновики и т.д.)
            var forms = await _context.Forms
                .Where(f => f.OwnerId == userId) // Фильтруем по ID владельца
                .Select(f => new FormDto
                {
                    Id = f.Id,
                    Title = f.Title,
                    Description = f.Description,
                    Status = f.Status,
                    CreatedAt = f.CreatedAt
                })
                .ToListAsync();

            return forms;
        }

        public Task PublishFormAsync(Guid formId) // Опубликовать форму (изменили int на Guid)
        {
            throw new NotImplementedException();
        }

        public Task DeleteFormAsync(Guid formId) // Удалить форму (изменили int на Guid)
        {
            throw new NotImplementedException();
        }
    }
}

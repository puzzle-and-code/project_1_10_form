using AuthService.Infrastructure.Persistence;
using FormBuilderWithAnalytics.src.Application.DTOs;
using FormBuilderWithAnalytics.src.Application.Interfaces;
using FormBuilderWithAnalytics.src.Domain.Models;

namespace FormBuilderWithAnalytics.src.Infrastructure.Services
{
    public class CreationFormsService: ICreationFormsService
    {
        private readonly AppDbContext _context;

        public CreationFormsService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<int> CreateDraftAsync(FormDto formDto, int ownerId) //создаем черновик формы
        {
            var form = new Form
            {
                Owner_id = ownerId,
                Title = formDto.Title ?? "Без названия",
                Description = formDto.Description ?? string.Empty,
                Status = "Draft", // Черновик
                Created_at = DateTime.UtcNow,
                Updated_at = DateTime.UtcNow
            };

            _context.Forms.Add(form);
            await _context.SaveChangesAsync();

            return form.Id; // Возвращаем ID созданной формы
        }

        public Task PublishFormAsync(int formId) //опубликовать форму
        {
            throw new NotImplementedException();
        }

        public Task DeleteFormAsync(int formId) //удалить форму
        {
            throw new NotImplementedException();
        }

       
    }
}

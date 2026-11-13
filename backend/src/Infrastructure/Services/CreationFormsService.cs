using AuthService.Infrastructure.Persistence;
using FormBuilderWithAnalytics.src.Application.DTOs;
using FormBuilderWithAnalytics.src.Application.Interfaces;
using FormBuilderWithAnalytics.src.Domain.Models;

namespace FormBuilderWithAnalytics.src.Infrastructure.Services
{
  
        public class CreationFormsService : ICreationFormsService
        {
            private readonly AppDbContext _context;

            public CreationFormsService(AppDbContext context)
            {
                _context = context;
            }

            public async Task<Guid> CreateDraftAsync(FormDto formDto, Guid ownerId)
            {
                var form = new Form
                {
                    OwnerId = ownerId,
                    Title = formDto.Title ?? "Без названия",
                    Description = formDto.Description ?? string.Empty,
                    Status = "draft",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Forms.Add(form);
                await _context.SaveChangesAsync();

                return form.Id;
            }

            public Task PublishFormAsync(Guid formId)
            {
                throw new NotImplementedException();
            }

            public Task DeleteFormAsync(Guid formId)
            {
                throw new NotImplementedException();
            }
        }
    }

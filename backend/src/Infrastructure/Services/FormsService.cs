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

        public async Task<IEnumerable<FormDto>> GetUserFormsAsync(Guid userId)
        {
           
            var forms = await _context.Forms
                .Where(f => f.OwnerId == userId) 
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

        public Task PublishFormAsync(Guid formId) 
        {
            throw new NotImplementedException();
        }

        public Task DeleteFormAsync(Guid formId) 
        {
            throw new NotImplementedException();
        }

        /// <summary>
        /// Получение формы с неудалёнными вопросами и вариантами, отсортированными по sort_order.
        /// </summary>
        public async Task<FormDetailsDto?> GetFormWithQuestionsAsync(Guid formId, Guid ownerId)
        {
            var form = await _context.Forms
                .Where(f => f.Id == formId && f.OwnerId == ownerId && f.DeletedAt == null)
                .Include(f => f.Questions.Where(q => q.DeletedAt == null))
                    .ThenInclude(q => q.Options.Where(o => o.DeletedAt == null))
                .FirstOrDefaultAsync();

            if (form == null)
            {
                return null;
            }

            return new FormDetailsDto
            {
                Id = form.Id,
                Title = form.Title,
                Description = form.Description,
                Status = form.Status,
                CreatedAt = form.CreatedAt,
                Questions = form.Questions
                    .OrderBy(q => q.SortOrder)
                    .Select(q => new QuestionDto
                    {
                        Id = q.Id,
                        Text = q.Text,
                        Type = q.Type,
                        IsRequired = q.IsRequired,
                        SortOrder = q.SortOrder,
                        Options = q.Options
                            .OrderBy(o => o.SortOrder)
                            .Select(o => new OptionDto
                            {
                                Id = o.Id,
                                Text = o.Text,
                                SortOrder = o.SortOrder
                            })
                            .ToList()
                    })
                    .ToList()
            };
        }

        /// <summary>
        /// Частично обновляет название и описание своей формы.
        /// Чужая или отсутствующая форма — null (контроллер отвечает 404).
        /// </summary>
        public async Task<FormDto?> UpdateFormAsync(Guid formId, Guid ownerId, UpdateFormDto dto)
        {
            var form = await _context.Forms
                .FirstOrDefaultAsync(f => f.Id == formId && f.OwnerId == ownerId && f.DeletedAt == null);

            if (form == null)
            {
                return null;
            }

            if (dto.Title != null)
            {
                form.Title = dto.Title;
            }

            if (dto.Description != null)
            {
                form.Description = dto.Description;
            }

            form.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new FormDto
            {
                Id = form.Id,
                Title = form.Title,
                Description = form.Description,
                Status = form.Status,
                CreatedAt = form.CreatedAt,
                UpdatedAt = form.UpdatedAt
            };
        }
    }
}

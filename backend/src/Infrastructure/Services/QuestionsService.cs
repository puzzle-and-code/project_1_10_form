using AuthService.Infrastructure.Persistence;
using FormBuilderWithAnalytics.src.Application.DTOs;
using FormBuilderWithAnalytics.src.Application.Interfaces;
using FormBuilderWithAnalytics.src.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace FormBuilderWithAnalytics.src.Infrastructure.Services
{
    public class QuestionsService : IQuestionsService
    {
        private readonly AppDbContext _context;

        public QuestionsService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<AddQuestionResult> AddQuestionAsync(Guid formId, Guid ownerId, CreateQuestionDto dto)
        {
            // Чужая, удалённая и несуществующая форма выглядят одинаково — как "не найдена".
            var form = await _context.Forms
                .AsNoTracking()
                .Where(f => f.Id == formId && f.OwnerId == ownerId && f.DeletedAt == null)
                .Select(f => new { f.Status })
                .FirstOrDefaultAsync();

            if (form == null)
            {
                return AddQuestionResult.FormNotFound();
            }

            // Завершённую форму конструктор не редактирует. Черновик и
            // опубликованная форма вопросы принимают.
            if (string.Equals(form.Status, FormStatuses.Closed, StringComparison.OrdinalIgnoreCase))
            {
                return AddQuestionResult.FormClosed();
            }

            // Новый вопрос идёт в конец списка неудалённых вопросов этой формы.
            // Нумерация с 1. При одновременных запросах теоретически возможны
            // одинаковые sort_order; если это станет проблемой, нужен
            // уникальный индекс (form_id, sort_order) или блокировка формы.
            var questions = _context.Set<Question>();
            var maxSortOrder = await questions
                .Where(q => q.FormId == formId && q.DeletedAt == null)
                .Select(q => (int?)q.SortOrder)
                .MaxAsync();

            var question = new Question
            {
                FormId = formId,
                Text = dto.Text!.Trim(),
                Type = dto.Type!,
                IsRequired = dto.IsRequired,
                SortOrder = (maxSortOrder ?? 0) + 1
            };

            // Варианты сохраняются только для вопросов с выбором.
            if (QuestionTypes.HasOptions(dto.Type) && dto.Options != null)
            {
                var order = 1;
                foreach (var optionDto in dto.Options)
                {
                    question.Options.Add(new Option
                    {
                        Text = optionDto.Text!.Trim(),
                        SortOrder = order++
                    });
                }
            }

            // Вопрос и его варианты уходят в базу одним SaveChanges —
            // то есть одной транзакцией: либо всё, либо ничего.
            questions.Add(question);
            await _context.SaveChangesAsync();

            return AddQuestionResult.Created(new QuestionDto
            {
                Id = question.Id,
                Text = question.Text,
                Type = question.Type,
                IsRequired = question.IsRequired,
                SortOrder = question.SortOrder,
                Options = question.Options
                    .OrderBy(o => o.SortOrder)
                    .Select(o => new OptionDto
                    {
                        Id = o.Id,
                        Text = o.Text,
                        SortOrder = o.SortOrder
                    })
                    .ToList()
            });
        }
    }
}

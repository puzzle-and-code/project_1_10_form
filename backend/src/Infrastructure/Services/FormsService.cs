using System.Text.Json;
using AuthService.Infrastructure.Persistence;
using FormBuilderWithAnalytics.src.Application.DTOs;
using FormBuilderWithAnalytics.src.Application.Interfaces;
using FormBuilderWithAnalytics.src.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace FormBuilderWithAnalytics.src.Infrastructure.Services
{
    public class FormsService : IFormsService
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
                Status = FormStatuses.Draft,
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
                .Where(f => f.OwnerId == userId && f.DeletedAt == null)
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

        public async Task<PublicFormDto?> GetPublicFormAsync(Guid formId)
        {
            var form = await _context.Forms
                .AsNoTracking()
                .Where(f => f.Id == formId
                            && f.DeletedAt == null
                            && f.Status == FormStatuses.Published)
                .Include(f => f.Questions.Where(q => q.DeletedAt == null))
                    .ThenInclude(q => q.Options.Where(o => o.DeletedAt == null))
                .FirstOrDefaultAsync();

            if (form == null)
            {
                return null;
            }

            return new PublicFormDto
            {
                Id = form.Id,
                Title = form.Title,
                Description = form.Description,
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

        public async Task<SubmitResponseResult> SubmitResponseAsync(Guid formId, List<SubmitAnswerItemDto>? answers)
        {
            var form = await _context.Forms
                .AsNoTracking()
                .Where(f => f.Id == formId
                            && f.DeletedAt == null
                            && f.Status == FormStatuses.Published)
                .Include(f => f.Questions.Where(q => q.DeletedAt == null))
                    .ThenInclude(q => q.Options.Where(o => o.DeletedAt == null))
                .FirstOrDefaultAsync();

            if (form == null)
            {
                return new SubmitResponseResult(null, "Форма недоступна или не найдена.", IsNotFound: true);
            }

            if (answers == null)
            {
                return new SubmitResponseResult(null, "Тело запроса должно содержать массив ответов.", IsBadRequest: true);
            }

            var activeQuestions = form.Questions.ToDictionary(q => q.Id);
            var answersByQuestion = new Dictionary<Guid, List<SubmitAnswerItemDto>>();

            foreach (var item in answers)
            {
                if (item.QuestionId == Guid.Empty || !activeQuestions.TryGetValue(item.QuestionId, out var question))
                {
                    return new SubmitResponseResult(
                        null,
                        $"Вопрос '{item.QuestionId}' не принадлежит форме или был удалён.",
                        IsBadRequest: true);
                }

                if (!answersByQuestion.TryGetValue(question.Id, out var list))
                {
                    list = new List<SubmitAnswerItemDto>();
                    answersByQuestion[question.Id] = list;
                }
                list.Add(item);
            }

            var answersToInsert = new List<Answer>();
            var responseId = Guid.NewGuid();
            var submittedAt = DateTime.UtcNow;

            foreach (var question in form.Questions)
            {
                answersByQuestion.TryGetValue(question.Id, out var submittedItems);
                var validOptions = question.Options.ToDictionary(o => o.Id);

                switch (question.Type)
                {
                    case QuestionTypes.ShortText:
                        {
                            if (submittedItems is { Count: > 1 })
                            {
                                return new SubmitResponseResult(
                                    null,
                                    $"Для текстового вопроса '{question.Text}' передано несколько ответов.",
                                    IsBadRequest: true);
                            }

                            var first = submittedItems?.FirstOrDefault();
                            var text = first?.ValueText;

                            if (string.IsNullOrWhiteSpace(text))
                            {
                                if (question.IsRequired)
                                {
                                    return new SubmitResponseResult(
                                        null,
                                        $"Обязательный вопрос '{question.Text}' не заполнен.",
                                        IsBadRequest: true);
                                }
                                break;
                            }

                            if (text.Length > 1500)
                            {
                                return new SubmitResponseResult(
                                    null,
                                    $"Ответ на вопрос '{question.Text}' превышает 1500 символов.",
                                    IsBadRequest: true);
                            }

                            answersToInsert.Add(new Answer
                            {
                                ResponseId = responseId,
                                QuestionId = question.Id,
                                ValueText = text
                            });
                            break;
                        }

                    case QuestionTypes.Number:
                        {
                            if (submittedItems is { Count: > 1 })
                            {
                                return new SubmitResponseResult(
                                    null,
                                    $"Для числового вопроса '{question.Text}' передано несколько ответов.",
                                    IsBadRequest: true);
                            }

                            var first = submittedItems?.FirstOrDefault();
                            if (first?.ValueNumber == null || first.ValueNumber.Value.ValueKind == JsonValueKind.Null)
                            {
                                if (question.IsRequired)
                                {
                                    return new SubmitResponseResult(
                                        null,
                                        $"Обязательный числовой вопрос '{question.Text}' не заполнен.",
                                        IsBadRequest: true);
                                }
                                break;
                            }

                            var el = first.ValueNumber.Value;
                            if (el.ValueKind != JsonValueKind.Number || !el.TryGetInt32(out var numValue))
                            {
                                return new SubmitResponseResult(
                                    null,
                                    $"Некорректное целое число для вопроса '{question.Text}'.",
                                    IsBadRequest: true);
                            }

                            answersToInsert.Add(new Answer
                            {
                                ResponseId = responseId,
                                QuestionId = question.Id,
                                ValueNumber = numValue
                            });
                            break;
                        }

                    case QuestionTypes.SingleChoice:
                        {
                            var selectedIds = new List<Guid>();
                            if (submittedItems != null)
                            {
                                foreach (var item in submittedItems)
                                {
                                    if (item.OptionId.HasValue)
                                    {
                                        selectedIds.Add(item.OptionId.Value);
                                    }
                                    if (item.OptionIds != null)
                                    {
                                        selectedIds.AddRange(item.OptionIds);
                                    }
                                }
                            }

                            if (selectedIds.Count == 0)
                            {
                                if (question.IsRequired)
                                {
                                    return new SubmitResponseResult(
                                        null,
                                        $"Для обязательного вопроса '{question.Text}' нужно выбрать вариант.",
                                        IsBadRequest: true);
                                }
                                break;
                            }

                            if (selectedIds.Count != 1)
                            {
                                return new SubmitResponseResult(
                                    null,
                                    $"Для вопроса '{question.Text}' допускается ровно один вариант.",
                                    IsBadRequest: true);
                            }

                            var optionId = selectedIds[0];
                            if (optionId == Guid.Empty || !validOptions.ContainsKey(optionId))
                            {
                                return new SubmitResponseResult(
                                    null,
                                    $"Вариант '{optionId}' не существует или недоступен для вопроса '{question.Text}'.",
                                    IsBadRequest: true);
                            }

                            answersToInsert.Add(new Answer
                            {
                                ResponseId = responseId,
                                QuestionId = question.Id,
                                OptionId = optionId
                            });
                            break;
                        }

                    case QuestionTypes.MultiChoice:
                        {
                            var selectedIds = new List<Guid>();
                            if (submittedItems != null)
                            {
                                foreach (var item in submittedItems)
                                {
                                    if (item.OptionId.HasValue)
                                    {
                                        selectedIds.Add(item.OptionId.Value);
                                    }
                                    if (item.OptionIds != null)
                                    {
                                        selectedIds.AddRange(item.OptionIds);
                                    }
                                }
                            }

                            var distinctOptionIds = selectedIds.Distinct().ToList();

                            if (distinctOptionIds.Count == 0)
                            {
                                if (question.IsRequired)
                                {
                                    return new SubmitResponseResult(
                                        null,
                                        $"Для обязательного вопроса '{question.Text}' нужно выбрать хотя бы один вариант.",
                                        IsBadRequest: true);
                                }
                                break;
                            }

                            foreach (var optionId in distinctOptionIds)
                            {
                                if (optionId == Guid.Empty || !validOptions.ContainsKey(optionId))
                                {
                                    return new SubmitResponseResult(
                                        null,
                                        $"Вариант '{optionId}' не существует или недоступен для вопроса '{question.Text}'.",
                                        IsBadRequest: true);
                                }

                                answersToInsert.Add(new Answer
                                {
                                    ResponseId = responseId,
                                    QuestionId = question.Id,
                                    OptionId = optionId
                                });
                            }
                            break;
                        }
                }
            }

            var response = new Response
            {
                Id = responseId,
                FormId = form.Id,
                SubmittedAt = submittedAt,
                Answers = answersToInsert
            };

            _context.Responses.Add(response);
            await _context.SaveChangesAsync();

            var responsesCount = await _context.Responses
                .CountAsync(r => r.FormId == form.Id);

            return new SubmitResponseResult(
                new CreateResponseResultDto
                {
                    ResponseId = response.Id,
                    SubmittedAt = response.SubmittedAt,
                    ResponsesCount = responsesCount
                },
                null);
        }
    }
}
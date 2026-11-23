using System.ComponentModel.DataAnnotations;

namespace FormBuilderWithAnalytics.src.Application.DTOs
{
    /// <summary>
    /// Тело запроса PUT /api/forms/{id}/questions/reorder — новый порядок
    /// вопросов формы. Проверка формата срабатывает автоматически
    /// ([ApiController]): при ошибках клиент получает 400, в базу ничего не попадает.
    /// </summary>
    public class ReorderQuestionsDto : IValidatableObject
    {
        /// <summary>
        /// Id ВСЕХ неудалённых вопросов формы в новом порядке: первый id
        /// получит sortOrder = 1, второй — 2 и так далее.
        /// </summary>
        public List<Guid>? QuestionIds { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (QuestionIds == null || QuestionIds.Count == 0)
            {
                yield return new ValidationResult(
                    "Передайте непустой список id вопросов.",
                    new[] { nameof(QuestionIds) });
                yield break;
            }

            if (QuestionIds.Any(x => x == Guid.Empty))
            {
                yield return new ValidationResult(
                    "Id вопроса не может быть пустым.",
                    new[] { nameof(QuestionIds) });
            }

            if (QuestionIds.Distinct().Count() != QuestionIds.Count)
            {
                yield return new ValidationResult(
                    "Id вопросов в списке не должны повторяться.",
                    new[] { nameof(QuestionIds) });
            }
        }
    }
}

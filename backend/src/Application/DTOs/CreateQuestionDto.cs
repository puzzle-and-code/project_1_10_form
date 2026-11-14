using System.ComponentModel.DataAnnotations;
using FormBuilderWithAnalytics.src.Domain.Models;

namespace FormBuilderWithAnalytics.src.Application.DTOs
{
    /// <summary>
    /// Тело запроса POST /api/forms/{id}/questions — один новый вопрос.
    /// Вся проверка собрана в Validate: она срабатывает автоматически
    /// ([ApiController]) ещё до вызова метода контроллера, и при ошибках
    /// клиент получает 400 со списком сообщений по полям. В базу в этом
    /// случае ничего не попадает.
    /// </summary>
    public class CreateQuestionDto : IValidatableObject
    {
        // Ограничения из задачи. Если лимит поменяется — править только здесь.
        public const int MaxTextLength = 1500;
        public const int MinChoiceOptions = 2;
        public const int MaxChoiceOptions = 20;
        public const int MaxOptionTextLength = 200;

        /// <summary>
        /// Текст вопроса. Обязателен; после удаления пробелов по краям
        /// должен быть от 1 до 1500 символов.
        /// </summary>
        /// <example>Как вас зовут?</example>
        public string? Text { get; set; }

        /// <summary>
        /// Тип вопроса: short_text, number, single_choice или multi_choice.
        /// После создания не меняется.
        /// </summary>
        /// <example>single_choice</example>
        public string? Type { get; set; }

        /// <summary>
        /// Обязателен ли ответ. Если поле не передано — true.
        /// </summary>
        /// <example>true</example>
        public bool IsRequired { get; set; } = true;

        /// <summary>
        /// Варианты ответа. Для short_text и number не передаются (пустой
        /// массив или отсутствие поля). Для single_choice и multi_choice
        /// — от 2 до 20 вариантов, текст каждого от 1 до 200 символов.
        /// </summary>
        public List<CreateOptionDto>? Options { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            var errors = new List<ValidationResult>();

            // --- text ---
            var text = Text?.Trim();
            if (string.IsNullOrEmpty(text))
            {
                errors.Add(new ValidationResult(
                    "Текст вопроса обязателен.",
                    new[] { nameof(Text) }));
            }
            else if (text.Length > MaxTextLength)
            {
                errors.Add(new ValidationResult(
                    $"Текст вопроса не должен превышать {MaxTextLength} символов.",
                    new[] { nameof(Text) }));
            }

            // --- type ---
            var typeKnown = false;
            if (string.IsNullOrWhiteSpace(Type))
            {
                errors.Add(new ValidationResult(
                    "Тип вопроса обязателен.",
                    new[] { nameof(Type) }));
            }
            else if (!QuestionTypes.IsKnown(Type))
            {
                errors.Add(new ValidationResult(
                    "Неизвестный тип вопроса. Допустимые значения: " +
                    string.Join(", ", QuestionTypes.All) + ".",
                    new[] { nameof(Type) }));
            }
            else
            {
                typeKnown = true;
            }

            // --- options: зависят от типа, поэтому без известного типа не проверяем ---
            if (!typeKnown)
            {
                return errors;
            }

            var count = Options?.Count ?? 0;

            if (QuestionTypes.HasOptions(Type))
            {
                if (count < MinChoiceOptions || count > MaxChoiceOptions)
                {
                    errors.Add(new ValidationResult(
                        $"Для вопроса с выбором нужно от {MinChoiceOptions} до {MaxChoiceOptions} вариантов ответа.",
                        new[] { nameof(Options) }));
                }

                for (var i = 0; i < count; i++)
                {
                    var option = Options![i];
                    var optionText = option?.Text?.Trim();
                    var key = $"{nameof(Options)}[{i}].{nameof(CreateOptionDto.Text)}";

                    if (string.IsNullOrEmpty(optionText))
                    {
                        errors.Add(new ValidationResult(
                            "Текст варианта ответа обязателен.",
                            new[] { key }));
                    }
                    else if (optionText.Length > MaxOptionTextLength)
                    {
                        errors.Add(new ValidationResult(
                            $"Текст варианта не должен превышать {MaxOptionTextLength} символов.",
                            new[] { key }));
                    }
                }
            }
            else if (count > 0)
            {
                // short_text и number: блока вариантов нет.
                errors.Add(new ValidationResult(
                    "Для вопросов типа short_text и number варианты ответа не передаются.",
                    new[] { nameof(Options) }));
            }

            return errors;
        }
    }

    /// <summary>
    /// Один вариант ответа в теле запроса.
    /// </summary>
    public class CreateOptionDto
    {
        /// <summary>
        /// Текст варианта, от 1 до 200 символов (после удаления пробелов по краям).
        /// </summary>
        /// <example>Да</example>
        public string? Text { get; set; }
    }
}

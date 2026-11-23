namespace FormBuilderWithAnalytics.src.Application.DTOs
{
    public enum ReorderQuestionsStatus
    {
        /// <summary>Порядок сохранён.</summary>
        Reordered,

        /// <summary>Формы нет, она удалена или принадлежит другому пользователю.</summary>
        FormNotFound,

        /// <summary>Форма завершена (closed) — конструктор её не редактирует.</summary>
        FormClosed,

        /// <summary>Список id не совпадает с набором вопросов формы (лишний, чужой или пропущенный id).</summary>
        QuestionsMismatch
    }

    /// <summary>
    /// Результат смены порядка: сервис сообщает, что произошло,
    /// а контроллер переводит это в HTTP-код (200 / 400 / 404 / 409).
    /// </summary>
    public class ReorderQuestionsResult
    {
        public ReorderQuestionsStatus Status { get; private set; }

        /// <summary>Вопросы в новом порядке; заполнено только при Status = Reordered.</summary>
        public List<QuestionDto>? Questions { get; private set; }

        public static ReorderQuestionsResult Reordered(List<QuestionDto> questions) =>
            new() { Status = ReorderQuestionsStatus.Reordered, Questions = questions };

        public static ReorderQuestionsResult FormNotFound() =>
            new() { Status = ReorderQuestionsStatus.FormNotFound };

        public static ReorderQuestionsResult FormClosed() =>
            new() { Status = ReorderQuestionsStatus.FormClosed };

        public static ReorderQuestionsResult QuestionsMismatch() =>
            new() { Status = ReorderQuestionsStatus.QuestionsMismatch };
    }
}

namespace FormBuilderWithAnalytics.src.Application.DTOs
{
    /// <summary>Тело ответа 200 на PUT /api/forms/{id}/questions/reorder.</summary>
    public class ReorderQuestionsResponse
    {
        /// <summary>Вопросы формы в новом порядке.</summary>
        public List<QuestionDto> Questions { get; set; } = new();
    }
}

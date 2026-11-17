namespace FormBuilderWithAnalytics.src.Application.DTOs
{
    public enum AddQuestionStatus
    {
        /// <summary>Вопрос создан.</summary>
        Created,

        /// <summary>Формы нет, она удалена или принадлежит другому пользователю.</summary>
        FormNotFound,

        /// <summary>Форма завершена (closed) — конструктор её не редактирует.</summary>
        FormClosed
    }

    /// <summary>
    /// Результат добавления вопроса: сервис сообщает, что произошло,
    /// а контроллер переводит это в HTTP-код (201 / 404 / 409).
    /// </summary>
    public class AddQuestionResult
    {
        public AddQuestionStatus Status { get; private set; }

        /// <summary>Созданный вопрос; заполнен только при Status = Created.</summary>
        public QuestionDto? Question { get; private set; }

        public static AddQuestionResult Created(QuestionDto question) =>
            new() { Status = AddQuestionStatus.Created, Question = question };

        public static AddQuestionResult FormNotFound() =>
            new() { Status = AddQuestionStatus.FormNotFound };

        public static AddQuestionResult FormClosed() =>
            new() { Status = AddQuestionStatus.FormClosed };
    }
}

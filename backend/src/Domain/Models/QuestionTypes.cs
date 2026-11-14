namespace FormBuilderWithAnalytics.src.Domain.Models
{
    /// <summary>
    /// Допустимые типы вопроса. В базе тип хранится строкой (questions.type),
    /// поэтому значения вынесены в константы, чтобы не разбрасывать
    /// строковые литералы по коду.
    /// </summary>
    public static class QuestionTypes
    {
        public const string ShortText = "short_text";
        public const string Number = "number";
        public const string SingleChoice = "single_choice";
        public const string MultiChoice = "multi_choice";

        public static readonly string[] All =
        {
            ShortText, Number, SingleChoice, MultiChoice
        };

        public static bool IsKnown(string? type) =>
            type != null && Array.IndexOf(All, type) >= 0;

        /// <summary>
        /// У вопросов с выбором есть варианты ответа, у остальных их нет.
        /// </summary>
        public static bool HasOptions(string? type) =>
            type == SingleChoice || type == MultiChoice;
    }

    /// <summary>
    /// Статусы формы (forms.status).
    /// </summary>
    public static class FormStatuses
    {
        public const string Draft = "draft";
        public const string Published = "published";
        public const string Closed = "closed";
    }
}

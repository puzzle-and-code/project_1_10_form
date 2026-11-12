namespace FormBuilderWithAnalytics.src.Application.DTOs
{
    public class FormDetailsDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }

        // Массив вопросов (согласно критериям приёмки)
        public List<QuestionDto> Questions { get; set; } = new();
    }

    public class QuestionDto
    {
        public Guid Id { get; set; }
        public string Text { get; set; }
        public string Type { get; set; }
        public bool IsRequired { get; set; }
        public int SortOrder { get; set; }

        // Массив вариантов ответа
        public List<OptionDto> Options { get; set; } = new();
    }

    public class OptionDto
    {
        public Guid Id { get; set; }
        public string Text { get; set; }
        public int SortOrder { get; set; }
    }
}

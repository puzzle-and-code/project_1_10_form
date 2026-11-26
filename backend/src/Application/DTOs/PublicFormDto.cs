namespace FormBuilderWithAnalytics.src.Application.DTOs
{
    public class PublicFormDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public List<QuestionDto> Questions { get; set; } = new();
    }
}

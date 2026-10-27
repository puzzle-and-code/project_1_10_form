namespace FormBuilderWithAnalytics.src.Application.DTOs
{
    /// <summary>
    /// Форма в ответе API (GET и PATCH возвращают один и тот же формат).
    /// </summary>
    public class FormResponseDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}

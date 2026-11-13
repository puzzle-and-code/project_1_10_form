namespace FormBuilderWithAnalytics.src.Application.DTOs
{
    public class FormDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty; // "Draft", "Published", "Deleted" и т.д.
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}

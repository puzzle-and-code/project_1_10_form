using System.Text.Json;

namespace FormBuilderWithAnalytics.src.Application.DTOs
{
    public class SubmitAnswerItemDto
    {
        public Guid QuestionId { get; set; }
        public string? ValueText { get; set; }
        public JsonElement? ValueNumber { get; set; }
        public Guid? OptionId { get; set; }
        public List<Guid>? OptionIds { get; set; }
    }
}

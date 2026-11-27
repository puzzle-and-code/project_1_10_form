namespace FormBuilderWithAnalytics.src.Application.DTOs
{
    public class CreateResponseResultDto
    {
        public Guid ResponseId { get; set; }
        public DateTime SubmittedAt { get; set; }
        public int ResponsesCount { get; set; }
    }
}

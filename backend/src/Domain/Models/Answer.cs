using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FormBuilderWithAnalytics.src.Domain.Models
{
    [Table("answers")]
    public class Answer
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("response_id")]
        public Guid ResponseId { get; set; }

        public Response Response { get; set; } = null!;

        [Column("question_id")]
        public Guid QuestionId { get; set; }

        public Question Question { get; set; } = null!;

        [Column("value_text")]
        [MaxLength(1500)]
        public string? ValueText { get; set; }

        [Column("value_number")]
        public int? ValueNumber { get; set; }

        [Column("option_id")]
        public Guid? OptionId { get; set; }

        public Option? Option { get; set; }
    }
}

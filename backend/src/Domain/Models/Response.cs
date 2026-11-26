using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FormBuilderWithAnalytics.src.Domain.Models
{
    [Table("responses")]
    public class Response
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("form_id")]
        public Guid FormId { get; set; }

        public Form Form { get; set; } = null!;

        [Column("submitted_at")]
        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Answer> Answers { get; set; } = new List<Answer>();
    }
}

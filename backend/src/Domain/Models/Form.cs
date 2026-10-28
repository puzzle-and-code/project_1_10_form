using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FormBuilderWithAnalytics.src.Domain.Models
{
    [Table("forms")]
        public class Form
        {
            [Key]
            [Column("id")]
            public Guid Id { get; set; } = Guid.NewGuid();

            [Column("owner_id")]
            public Guid OwnerId { get; set; }

            [Column("title")]
            [Required]
            [MaxLength(200)]
            public string Title { get; set; } = string.Empty;

            [Column("description")]
            [MaxLength(2000)]
            public string? Description { get; set; }

            [Column("status")]
            [Required]
            [MaxLength(20)]
            public string Status { get; set; } = "draft"; // По умолчанию draft

            [Column("created_at")]
            public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

            [Column("updated_at")]
            public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

            [Column("published_at")]
            public DateTime? PublishedAt { get; set; }

            [Column("closed_at")]
            public DateTime? ClosedAt { get; set; }

            [Column("deleted_at")]
            public DateTime? DeletedAt { get; set; } // Если заполнено, значит форма удалена (мягкое удаление)
        }
}


using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FormBuilderWithAnalytics.src.Domain.Models
{
    [Table("questions")] 
    public class Question
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("form_id")]
        public Guid FormId { get; set; }

        public Form Form { get; set; } = null!;

        [Column("text")]
        [Required]
        [MaxLength(2500)]
        public string Text { get; set; } = string.Empty;

        [Column("type")]
        [Required]
        [MaxLength(30)]
        public string Type { get; set; } = string.Empty;

        [Column("is_required")]
        public bool IsRequired { get; set; } = true;

        [Column("sort_order")]
        public int SortOrder { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }

        public ICollection<Option> Options { get; set; } = new List<Option>();
    }
    }


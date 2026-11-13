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
            public string Text { get; set; } = string.Empty;

            [Column("type")]
            public string Type { get; set; } = string.Empty;

            [Column("is_required")]
            public bool IsRequired { get; set; }

            [Column("sort_order")]
            public int SortOrder { get; set; }

            [Column("deleted_at")]
            public DateTime? DeletedAt { get; set; }

            public ICollection<Option> Options { get; set; } = new List<Option>();
        }
    }


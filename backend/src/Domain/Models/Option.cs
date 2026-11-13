using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FormBuilderWithAnalytics.src.Domain.Models
{
    [Table("options")] 
    public class Option
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("question_id")]
        public Guid QuestionId { get; set; } // Внешний ключ на вопрос

        public Question Question { get; set; } = null!;

        [Column("text")]
        [Required]
        public string Text { get; set; } = string.Empty; // Текст варианта ответа

        [Column("sort_order")]
        public int SortOrder { get; set; }   // Порядковый номер для сортировки

        [Column("deleted_at")]
        public DateTime? DeletedAt { get; set; }
    }
}

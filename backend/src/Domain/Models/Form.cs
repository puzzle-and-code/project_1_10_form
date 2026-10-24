namespace FormBuilderWithAnalytics.src.Domain.Models
{
    /// <summary>
    /// Анкета (форма/опрос). Минимальная версия под текущие задачи
    /// (GET своей формы, PATCH названия/описания) — поля вопросов,
    /// черновик/публикация и т.д. добавятся отдельными задачами.
    /// </summary>
    public class Form
    {
        /// <summary>
        /// Идентификатор формы
        /// </summary>
        public Guid id { get; set; }

        /// <summary>
        /// Id пользователя-владельца (создателя) формы
        /// </summary>
        public Guid owner_id { get; set; }

        /// <summary>
        /// Название формы
        /// </summary>
        public string title { get; set; } = string.Empty;

        /// <summary>
        /// Описание формы (необязательное)
        /// </summary>
        public string? description { get; set; }

        /// <summary>
        /// Дата создания
        /// </summary>
        public DateTime created_at { get; set; }

        /// <summary>
        /// Дата последнего изменения
        /// </summary>
        public DateTime updated_at { get; set; }
    }
}

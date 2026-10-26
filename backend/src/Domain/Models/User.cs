namespace FormBuilderWithAnalytics.src.Domain.Models
{
    public class User
    {
        /// <summary>
        /// Идентификатор пользователя
        /// </summary>
        public Guid id { get; set; } 

        /// <summary>
        /// Логин
        /// </summary>
        public string email { get; set; }

        /// <summary>
        /// Хэш пароля
        /// </summary>
        public string password_hash { get; set; }

        /// <summary>
        /// имя для шапки
        /// </summary>
        public string? display_name { get; set; }

        /// <summary>
        /// дата создания пользователя
        /// </summary>
        public DateTime created_at { get; set; }

    }
}

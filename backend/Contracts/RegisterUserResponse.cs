namespace FormBuilderWithAnalytics.Contracts;

/// <summary>
/// Ответ на успешную регистрацию. Пока без реальной БД — Id генерируется
/// на лету просто чтобы показать форму ответа. Как только появится
/// сущность User и миграция для неё (следующая задача), сюда вернётся
/// настоящий сохранённый Id.
/// </summary>
/// <param name="Id">Идентификатор созданного пользователя (временный, не персистентный).</param>
/// <param name="Email">Email, с которым прошла регистрация.</param>
public record RegisterUserResponse(Guid Id, string Email);

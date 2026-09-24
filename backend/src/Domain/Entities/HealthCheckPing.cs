namespace AuthService.Domain.Entities;

/// <summary>
/// Технический "объект-заглушка" без бизнес-смысла.
/// Единственная цель — иметь хотя бы одну таблицу, на которой можно
/// создать и применить первую (тестовую) миграцию и подтвердить,
/// что пайплайн dotnet-ef работает от начала до конца.
///
/// Когда появятся реальные доменные сущности (User, Organization и т.д.
/// — следующий раздел бэклога), этот класс и его миграцию можно удалить.
/// </summary>
public class HealthCheckPing
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

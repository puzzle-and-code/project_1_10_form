# Черновик модели авторизации (НЕ часть текущих двух задач)

Это просто набросок на будущее, по мотивам того, что рассказал напарник,
чтобы не забыть. Не нужно реализовывать это прямо сейчас — по задаче
достаточно тестовой миграции (см. HealthCheckPing.cs). Реальные доменные
миграции (User/Organization/Form) — это "следующий раздел бэклога".

Идея (physical/legal person через общий базовый класс — обычный вариант
для "либо физлицо, либо организация"):

```csharp
public abstract class Account
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class IndividualAccount : Account
{
    public string FullName { get; set; } = default!; // ФИО
    public int Age { get; set; }
}

public class OrganizationAccount : Account
{
    public string Name { get; set; } = default!;        // название
    public string? Description { get; set; }             // описание
}
```

В EF Core это ложится на TPH (Table-Per-Hierarchy, одна таблица + discriminator)
или TPT (несколько таблиц). Для старта проще и дешевле TPH — обсудите
с напарником при реализации реальных миграций.

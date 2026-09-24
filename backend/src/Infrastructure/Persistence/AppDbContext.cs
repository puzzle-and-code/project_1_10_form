using AuthService.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // Тестовая таблица — см. комментарий в Domain/Entities/HealthCheckPing.cs.
    // Реальные DbSet'ы (User, Organization, ...) добавятся в следующей задаче.
    public DbSet<HealthCheckPing> HealthCheckPings => Set<HealthCheckPing>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<HealthCheckPing>(entity =>
        {
            entity.ToTable("health_check_pings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CreatedAtUtc).IsRequired();
        });
    }
}

using AuthService.Domain.Entities;
using FormBuilderWithAnalytics.src.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<HealthCheckPing> HealthCheckPings => Set<HealthCheckPing>();


    public DbSet<User> Users => Set<User>();

    public DbSet<Form> Forms => Set<Form>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<HealthCheckPing>(entity =>
        {
            entity.ToTable("health_check_pings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CreatedAtUtc).IsRequired();
        });


        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.id);

            entity.Property(e => e.id)
                .HasColumnType("uuid");

            entity.Property(e => e.email)
                .HasMaxLength(255)
                .IsRequired();


            entity.HasIndex(e => e.email)
                .IsUnique();

            entity.Property(e => e.password_hash)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.display_name)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.created_at)
                .HasColumnType("timestamptz")
                .IsRequired();
        });

        modelBuilder.Entity<Form>(entity =>
        {
            entity.ToTable("forms");
            entity.HasKey(e => e.id);

            entity.Property(e => e.id)
                .HasColumnType("uuid");

            entity.Property(e => e.owner_id)
                .HasColumnType("uuid")
                .IsRequired();

            entity.Property(e => e.title)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(e => e.description)
                .HasMaxLength(2000);

            entity.Property(e => e.created_at)
                .HasColumnType("timestamptz")
                .IsRequired();

            entity.Property(e => e.updated_at)
                .HasColumnType("timestamptz")
                .IsRequired();

            entity.HasIndex(e => e.owner_id);

            // Владелец формы — пользователь. Без навигационного свойства
            // на User (не нужно для текущих задач), просто FK по owner_id.
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.owner_id)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}

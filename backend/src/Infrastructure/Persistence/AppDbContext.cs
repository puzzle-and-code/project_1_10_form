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
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<Option> QuestionOptions => Set<Option>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<HealthCheckPing>(entity =>
        {
            entity.ToTable("health_check_pings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CreatedAtUtc).IsRequired();
        });

        modelBuilder.Entity<Form>(entity =>
        {
            entity.ToTable("forms");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("uuid");
            entity.Property(e => e.OwnerId).HasColumnName("owner_id").HasColumnType("uuid").IsRequired();
            entity.Property(e => e.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").HasMaxLength(2000);
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasColumnType("timestamptz").IsRequired();
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamptz").IsRequired();
            entity.Property(e => e.PublishedAt).HasColumnName("published_at").HasColumnType("timestamptz");
            entity.Property(e => e.ClosedAt).HasColumnName("closed_at").HasColumnType("timestamptz");
            entity.Property(e => e.DeletedAt).HasColumnName("deleted_at").HasColumnType("timestamptz");
        });

        modelBuilder.Entity<Question>(entity =>
        {
            entity.ToTable("questions", t =>
            {
                t.HasCheckConstraint(
                    "CK_questions_type",
                    "\"type\" IN ('short_text', 'number', 'single_choice', 'multi_choice')"
                );
            });

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .HasColumnName("id")
                .HasColumnType("uuid");

            entity.Property(e => e.FormId)
                .HasColumnName("form_id")
                .HasColumnType("uuid")
                .IsRequired();

            entity.Property(e => e.Text)
                .HasColumnName("text")
                .HasMaxLength(2500)
                .IsRequired();

            entity.Property(e => e.Type)
                .HasColumnName("type")
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(e => e.IsRequired)
                .HasColumnName("is_required")
                .HasDefaultValue(true)
                .IsRequired();

            entity.Property(e => e.SortOrder)
                .HasColumnName("sort_order")
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .HasColumnType("timestamptz")
                .IsRequired();

            entity.Property(e => e.UpdatedAt)
                .HasColumnName("updated_at")
                .HasColumnType("timestamptz")
                .IsRequired();

            entity.Property(e => e.DeletedAt)
                .HasColumnName("deleted_at")
                .HasColumnType("timestamptz");

            entity.HasIndex(e => e.FormId)
                .HasDatabaseName("ix_questions_form_id");

            entity.HasOne(e => e.Form)
                .WithMany(f => f.Questions)
                .HasForeignKey(e => e.FormId)
                .HasConstraintName("fk_questions_forms_form_id")
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Option>(entity =>
        {
            entity.ToTable("question_options");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .HasColumnName("id")
                .HasColumnType("uuid");

            entity.Property(e => e.QuestionId)
                .HasColumnName("question_id")
                .HasColumnType("uuid")
                .IsRequired();

            entity.Property(e => e.Text)
                .HasColumnName("text")
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(e => e.SortOrder)
                .HasColumnName("sort_order")
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .HasColumnType("timestamptz")
                .IsRequired();

            entity.Property(e => e.DeletedAt)
                .HasColumnName("deleted_at")
                .HasColumnType("timestamptz");

            entity.HasIndex(e => e.QuestionId)
                .HasDatabaseName("ix_question_options_question_id");

            entity.HasOne(e => e.Question)
                .WithMany(q => q.Options)
                .HasForeignKey(e => e.QuestionId)
                .HasConstraintName("fk_question_options_questions_question_id")
                .OnDelete(DeleteBehavior.Restrict);
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

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .HasColumnName("id")
                .HasColumnType("uuid");

            entity.Property(e => e.UserId)
                .HasColumnName("user_id")
                .HasColumnType("uuid")
                .IsRequired();

            entity.Property(e => e.TokenHash)
                .HasColumnName("token_hash")
                .HasMaxLength(128)
                .IsRequired();

            entity.Property(e => e.ExpiresAt)
                .HasColumnName("expires_at")
                .HasColumnType("timestamptz")
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .HasColumnType("timestamptz")
                .IsRequired();

            entity.Property(e => e.RevokedAt)
                .HasColumnName("revoked_at")
                .HasColumnType("timestamptz");

            entity.HasIndex(e => e.TokenHash)
                .HasDatabaseName("ix_refresh_tokens_token_hash");

            entity.HasIndex(e => e.UserId)
                .HasDatabaseName("ix_refresh_tokens_user_id");

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .HasConstraintName("fk_refresh_tokens_users_user_id")
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormBuilderWithAnalytics.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestionsAndQuestionOptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_options_questions_question_id",
                table: "options");

            migrationBuilder.DropForeignKey(
                name: "FK_questions_forms_form_id",
                table: "questions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_options",
                table: "options");

            migrationBuilder.RenameTable(
                name: "options",
                newName: "question_options");

            migrationBuilder.RenameIndex(
                name: "IX_questions_form_id",
                table: "questions",
                newName: "ix_questions_form_id");

            migrationBuilder.RenameIndex(
                name: "IX_options_question_id",
                table: "question_options",
                newName: "ix_question_options_question_id");

            migrationBuilder.AlterColumn<string>(
                name: "type",
                table: "questions",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "text",
                table: "questions",
                type: "character varying(2500)",
                maxLength: 2500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<bool>(
                name: "is_required",
                table: "questions",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<DateTime>(
                name: "deleted_at",
                table: "questions",
                type: "timestamptz",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "questions",
                type: "timestamptz",
                nullable: false,
                defaultValueSql: "timezone('utc', now())");

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "questions",
                type: "timestamptz",
                nullable: false,
                defaultValueSql: "timezone('utc', now())");

            migrationBuilder.AlterColumn<string>(
                name: "text",
                table: "question_options",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<DateTime>(
                name: "deleted_at",
                table: "question_options",
                type: "timestamptz",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "question_options",
                type: "timestamptz",
                nullable: false,
                defaultValueSql: "timezone('utc', now())");

            migrationBuilder.AddPrimaryKey(
                name: "PK_question_options",
                table: "question_options",
                column: "id");

            migrationBuilder.AddCheckConstraint(
                name: "CK_questions_type",
                table: "questions",
                sql: "\"type\" IN ('short_text', 'number', 'single_choice', 'multi_choice')");

            migrationBuilder.AddForeignKey(
                name: "fk_question_options_questions_question_id",
                table: "question_options",
                column: "question_id",
                principalTable: "questions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_questions_forms_form_id",
                table: "questions",
                column: "form_id",
                principalTable: "forms",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_question_options_questions_question_id",
                table: "question_options");

            migrationBuilder.DropForeignKey(
                name: "fk_questions_forms_form_id",
                table: "questions");

            migrationBuilder.DropCheckConstraint(
                name: "CK_questions_type",
                table: "questions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_question_options",
                table: "question_options");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "questions");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "question_options");

            migrationBuilder.RenameTable(
                name: "question_options",
                newName: "options");

            migrationBuilder.RenameIndex(
                name: "ix_questions_form_id",
                table: "questions",
                newName: "IX_questions_form_id");

            migrationBuilder.RenameIndex(
                name: "ix_question_options_question_id",
                table: "options",
                newName: "IX_options_question_id");

            migrationBuilder.AlterColumn<string>(
                name: "type",
                table: "questions",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30);

            migrationBuilder.AlterColumn<string>(
                name: "text",
                table: "questions",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(2500)",
                oldMaxLength: 2500);

            migrationBuilder.AlterColumn<bool>(
                name: "is_required",
                table: "questions",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "deleted_at",
                table: "questions",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamptz",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "text",
                table: "options",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<DateTime>(
                name: "deleted_at",
                table: "options",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamptz",
                oldNullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_options",
                table: "options",
                column: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_options_questions_question_id",
                table: "options",
                column: "question_id",
                principalTable: "questions",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_questions_forms_form_id",
                table: "questions",
                column: "form_id",
                principalTable: "forms",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
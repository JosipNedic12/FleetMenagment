using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FleetManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMustChangePassword : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "MustChangePassword",
                schema: "fleet",
                table: "app_user",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Mark previously-applied migrations as done (tables already exist in DB)
            migrationBuilder.Sql(@"
                INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
                VALUES
                    ('20260224140249_TestSnapshot', '9.0.1'),
                    ('20260225105023_AddOdometerLog', '9.0.1'),
                    ('20260225120321_FixMaintenanceItem', '9.0.1')
                ON CONFLICT DO NOTHING;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MustChangePassword",
                schema: "fleet",
                table: "app_user");
        }
    }
}

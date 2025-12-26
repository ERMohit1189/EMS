This folder contains SQL migration scripts to be applied to the development SQL Server database.

Usage:
- Review the SQL files in this folder.
- Run them against your development database (e.g., via SSMS or sqlcmd):
  sqlcmd -S <server> -d <database> -i 20251226_add_teams.sql

Notes:
- Scripts include IF NOT EXISTS checks and are safe to re-run in development when tables already exist.
- The scripts add default constraints for CreatedAt/UpdatedAt using SYSUTCDATETIME().
- If you want EF Core migrations instead, run `dotnet ef migrations add <Name>` and `dotnet ef database update` in the backend-dotnet project.

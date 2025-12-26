# VendorRegistrationForm — .NET Backend (PoC)

This folder contains an ASP.NET Core PoC backend scaffold for the Node->.NET migration.

What's included (minimal PoC):
- `Program.cs` — app bootstrap
- `Controllers/EmployeesController.cs` — login/logout endpoints
- `Data/AppDbContext.cs` — EF Core DbContext (Postgres)
- `Models/*` — DTOs and EF models
- `Services/IAuthService.cs`, `Services/AuthService.cs` — authentication abstraction
- `Dockerfile` — sample Dockerfile

How to run locally (requires .NET 8 SDK):
1. dotnet restore
2a. (Option A) Apply SQL script to create initial schema using sqlcmd (see scripts/apply-migration.ps1):
   powershell -File scripts\apply-migration.ps1 -Server localhost -Database eoms_db -User sa -Password Your_password123

2b. (Option B) Use EF Core migrations (recommended for long term):
   dotnet tool install --global dotnet-ef
   dotnet ef migrations add InitialCreate
   dotnet ef database update

3. dotnet run

Note: For PoC the application will call `Database.EnsureCreated()` at startup to create missing tables if you prefer not to run migrations manually.

Seeding:
- On first start, the app will seed a default admin user if no employees exist.
- Default credentials:
  - Email: `admin@example.com`
  - Password: `Password123!`
- Override via environment variables:
  - `SEED_ADMIN_EMAIL` — e.g. `admin@yourdomain.com`
  - `SEED_ADMIN_PASSWORD` — e.g. `StrongP@ssw0rd`


Note: This is a starting scaffold for the PoC (login + session)."
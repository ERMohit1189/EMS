using Microsoft.EntityFrameworkCore;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Services;
using Serilog;
using Microsoft.OpenApi.Models;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog for logging
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .WriteTo.Console()
    .WriteTo.File("logs/app.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// Configuration
builder.Services.AddControllers();

// Database Configuration
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection") ??
        "Server=(local);Database=EOMS;Trusted_Connection=true;",
        sqlOptions => sqlOptions.CommandTimeout(30)
    )
);

// CORS Configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:7000",
                "https://localhost:7000",
                "http://localhost:5173",
                "https://localhost:5173",
                "http://localhost:3000",
                "https://localhost:3000"
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();  // Allow cookies and credentials
    });
});

// Authentication & Authorization
builder.Services.AddAuthentication("Cookies")
    .AddCookie("Cookies", options =>
    {
        // Use a distinct cookie name for authentication ticket to avoid colliding with server session id cookie
        options.Cookie.Name = ".eoms_auth";
        options.Cookie.HttpOnly = true;
        // Use SameSite=None for CORS with credentials to work
        options.Cookie.SameSite = SameSiteMode.None;
        // Use SameAsRequest for development to work with both HTTP and HTTPS
        options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
            ? CookieSecurePolicy.SameAsRequest
            : CookieSecurePolicy.Always;
        options.ExpireTimeSpan = TimeSpan.FromDays(7);
        // Don't redirect on authentication failure - API will handle it
        options.LoginPath = Microsoft.AspNetCore.Http.PathString.Empty;
        options.LogoutPath = Microsoft.AspNetCore.Http.PathString.Empty;
        options.AccessDeniedPath = Microsoft.AspNetCore.Http.PathString.Empty;
    });

builder.Services.AddAuthorization();

// Swagger/OpenAPI Configuration
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Vendor Registration & EOMS API",
        Version = "v1.0.0",
        Description = "API for Vendor Registration and Employee Operations Management System",
        Contact = new OpenApiContact
        {
            Name = "API Support",
            Email = "support@example.com"
        },
        License = new OpenApiLicense
        {
            Name = "MIT",
            Url = new Uri("https://opensource.org/licenses/MIT")
        }
    });

    // Add security definition for Bearer token
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "JWT Authorization header using the Bearer scheme."
    });

    // Add security requirement
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] { }
        }
    });

    // Include XML comments for better documentation
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

// Dependency Injection for Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmployeeService, EmployeeService>();
builder.Services.AddScoped<IVendorService, VendorService>();
builder.Services.AddScoped<ISiteService, SiteService>();
builder.Services.AddScoped<IPurchaseOrderService, PurchaseOrderService>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddScoped<IAttendanceService, AttendanceService>();
builder.Services.AddScoped<ILeaveService, LeaveService>();
builder.Services.AddScoped<ISalaryService, SalaryService>();
builder.Services.AddScoped<IHolidayService, HolidayService>();
builder.Services.AddScoped<IReportsService, ReportsService>();
builder.Services.AddScoped<IDepartmentService, DepartmentService>();
builder.Services.AddScoped<IDesignationService, DesignationService>();
builder.Services.AddScoped<IZoneService, ZoneService>();
builder.Services.AddScoped<ICircleService, CircleService>();
builder.Services.AddScoped<IAllowanceService, AllowanceService>();
builder.Services.AddScoped<IExportHeaderService, ExportHeaderService>();
builder.Services.AddScoped<IAppSettingsService, AppSettingsService>();
builder.Services.AddScoped<IEmailService, EmailService>();

// Add support for JSON serialization options
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.WriteIndented = true;
    });

var app = builder.Build();

// Middleware
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

// Enable Swagger
app.UseSwagger(c =>
{
    c.RouteTemplate = "api/swagger/{documentName}/swagger.json";
});

app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/api/swagger/v1/swagger.json", "Vendor Registration & EOMS API v1.0.0");
    c.RoutePrefix = "api/swagger";
    c.DefaultModelsExpandDepth(2);
    c.DefaultModelExpandDepth(2);
    c.DocExpansion(Swashbuckle.AspNetCore.SwaggerUI.DocExpansion.List);
    c.DisplayRequestDuration();
    c.ShowExtensions();
});

app.UseCors("AllowFrontend");  // CORS must be before UseHttpsRedirection
app.UseHttpsRedirection();

// Middleware to prevent redirects on API authentication failures
app.Use(async (context, next) =>
{
    await next();

    // If it's an API request that got redirected (302/301), convert to 401
    if (context.Request.Path.StartsWithSegments("/api") &&
        (context.Response.StatusCode == 302 || context.Response.StatusCode == 301) &&
        !context.Response.HasStarted)
    {
        context.Response.Clear();
        context.Response.StatusCode = 401;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new { message = "Unauthorized" });
    }
});

app.UseRouting();
app.UseAuthentication();

// Compatibility middleware: if request contains a server session id cookie (`sid`) but no authenticated user,
// try to restore the user from the Sessions table to support Node-style session cookies.
app.Use(async (context, next) =>
{
    if (!(context.User?.Identity?.IsAuthenticated ?? false))
    {
        if (context.Request.Cookies.TryGetValue("sid", out var sid) && !string.IsNullOrEmpty(sid))
        {
            try
            {
                var db = context.RequestServices.GetRequiredService<AppDbContext>();
                var row = await db.Sessions.FindAsync(sid);
                if (row != null && (row.ExpiresAt == null || row.ExpiresAt > DateTime.UtcNow))
                {
                    // Attempt to read employeeId from session data (stored as simple JSON)
                    string employeeId = string.Empty;
                    try
                    {
                        var json = System.Text.Json.JsonDocument.Parse(row.Data);
                        if (json.RootElement.TryGetProperty("employeeId", out var eId)) employeeId = eId.GetString() ?? string.Empty;
                        if (string.IsNullOrEmpty(employeeId) && json.RootElement.TryGetProperty("employeeEmail", out var eEmail))
                        {
                            // fallback: try to resolve employee by email
                            var email = eEmail.GetString();
                            if (!string.IsNullOrEmpty(email))
                            {
                                var emp = await db.Employees.FirstOrDefaultAsync(e => e.Email == email);
                                if (emp != null) employeeId = emp.Id;
                            }
                        }
                    }
                    catch { /* ignore parse errors */ }

                    if (!string.IsNullOrEmpty(employeeId))
                    {
                        var employee = await db.Employees.FindAsync(employeeId);
                        if (employee != null)
                        {
                            var claims = new[] {
                                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, employee.Id),
                                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Name, employee.Name ?? ""),
                                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Email, employee.Email ?? ""),
                                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, employee.Role ?? "user"),
                                new System.Security.Claims.Claim("Role", employee.Role ?? "user"),
                                new System.Security.Claims.Claim("UserType", "employee"),
                            };
                            var identity = new System.Security.Claims.ClaimsIdentity(claims, "sid");
                            context.User = new System.Security.Claims.ClaimsPrincipal(identity);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                // Don't fail the request for session restore errors
                Serilog.Log.Warning(ex, "Session restore failed for sid {Sid}", sid);
            }
        }
    }

    await next();
});

app.UseAuthorization();

app.MapControllers();

// Initialize database and seed data
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        // Ensure database schema exists without deleting data
        db.Database.EnsureCreated();
        Log.Information("Database schema ensured");

        // Seed admin user if none exists
        if (!db.Employees.Any())
        {
            var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
            var seedEmail = config["SEED_ADMIN_EMAIL"] ?? "admin@example.com";
            var seedPassword = config["SEED_ADMIN_PASSWORD"] ?? "Admin@123";

            var adminUser = new VendorRegistrationBackend.Models.Employee
            {
                Id = Guid.NewGuid().ToString(),
                Name = "Super Admin",
                Email = seedEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(seedPassword),
                Role = "superadmin",
                EmpCode = "EMP00001",
                Status = "active"
            };

            db.Employees.Add(adminUser);
            db.SaveChanges();
            Log.Information($"Seeded admin user: {seedEmail}");
        }
    }
    catch (Exception ex)
    {
        Log.Fatal(ex, "Failed to initialize database");
        throw;
    }
}

Log.Information("Starting application");
app.Run();
Log.CloseAndFlush();

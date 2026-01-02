using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Middleware;
using VendorRegistrationBackend.Services;

var builder = WebApplication.CreateBuilder(args);

// -------------------- SERILOG --------------------
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Debug()
    .WriteTo.Console()
    .WriteTo.File("logs/app.log", rollingInterval: RollingInterval.Day)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "EOMS")
    .CreateLogger();

builder.Host.UseSerilog();

Log.Information("[STARTUP] Application starting...");

// -------------------- ROUTING --------------------
builder.Services.AddRouting(o => o.LowercaseUrls = true);

// -------------------- CONTROLLERS --------------------
var controllerBuilder = builder.Services.AddControllers();
controllerBuilder.AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    o.JsonSerializerOptions.WriteIndented = true;
    o.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});

// -------------------- DB --------------------
// Use only AddDbContextFactory to support both Scoped and independent context creation
builder.Services.AddDbContextFactory<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions => sqlOptions.CommandTimeout(30)
    ), ServiceLifetime.Scoped  // Factory itself is scoped, allows creation of scoped contexts
);

// -------------------- CORS --------------------
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "https://eoms.jtstechnology.in",
                "http://localhost:7000",
                "http://localhost:3000",
                "http://localhost:5173",
                "http://localhost:5174",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// -------------------- AUTHENTICATION (JWT) --------------------
builder.Services
    .AddAuthentication(options=>{
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme; }
    )
    .AddJwtBearer(options =>
    {
        var jwt = builder.Configuration.GetSection("Jwt");
        var secret = jwt["SecretKey"] ?? throw new Exception("JWT SecretKey missing");

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            ClockSkew = TimeSpan.FromSeconds(5),  // Allow 5 seconds clock skew for server time differences
            RoleClaimType = ClaimTypes.Role,
            NameClaimType = ClaimTypes.NameIdentifier
        };

        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                Log.Error(context.Exception,
                    "[AUTH] Authentication FAILED | Path={Path} | Exception={Exception}",
                    context.HttpContext.Request.Path,
                    context.Exception?.Message ?? "Unknown error"
                );
                return Task.CompletedTask;
            },

            OnTokenValidated = context =>
            {
                var claims = context.Principal?.Claims
                    .Select(c => $"{c.Type}={c.Value}");

                var roles = context.Principal?.FindAll(ClaimTypes.Role)
                    .Select(c => c.Value) ?? new List<string>();

                Log.Information(
                    "[AUTH] Token VALIDATED | User={User} | Roles={Roles} | Claims={Claims}",
                    context.Principal?.Identity?.Name,
                    roles.Any() ? string.Join(",", roles) : "NO ROLES",
                    claims != null ? string.Join(" | ", claims) : "NO CLAIMS"
                );

                return Task.CompletedTask;
            },
            OnChallenge = async context =>
            {
                var audit = context.HttpContext.RequestServices
                    .GetRequiredService<IAuthAuditService>();

                await audit.LogAsync(context.HttpContext, "UNAUTHORIZED");

                Log.Warning(
                    "[AUTH] 401 UNAUTHORIZED | Path={Path} | Error={Error} | Desc={Desc}",
                    context.HttpContext.Request.Path,
                    context.Error
                );
            }
        };
    });

// -------------------- AUTHORIZATION --------------------
builder.Services.AddAuthorization(options =>
{
    // Configure case-insensitive role comparison
    // This allows BOTH [Authorize(Roles = "admin")] AND [Authorize(Roles = "Admin")] to work
    options.DefaultPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

// Register custom case-insensitive role handler
builder.Services.AddSingleton<IAuthorizationHandler, CaseInsensitiveRoleHandler>();

// -------------------- SWAGGER --------------------
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Vendor Registration & EOMS API",
        Version = "v1"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
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
            Array.Empty<string>()
        }
    });
});

// -------------------- SERVICES --------------------
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
builder.Services.AddScoped<ReportPdfService>();
builder.Services.AddScoped<IDepartmentService, DepartmentService>();
builder.Services.AddScoped<IDesignationService, DesignationService>();
builder.Services.AddScoped<IZoneService, ZoneService>();
builder.Services.AddScoped<ICircleService, CircleService>();
builder.Services.AddScoped<IAllowanceService, AllowanceService>();
builder.Services.AddScoped<IExportHeaderService, ExportHeaderService>();
builder.Services.AddScoped<IAppSettingsService, AppSettingsService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAuthAuditService, AuthAuditService>();
builder.Services.AddScoped<RequestLoggingService>();  // For comprehensive request logging


// -------------------- BUILD --------------------
var app = builder.Build();

// -------------------- MIDDLEWARE ORDER --------------------
// Enable Swagger only in Development environment
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "EOMS API v1");
    });
    Log.Information("[APP] Swagger enabled for Development environment");
}
else
{
    Log.Information("[APP] Swagger disabled for {Environment} environment", app.Environment.EnvironmentName);
}

// -------------------- HTTPS ENFORCEMENT --------------------
// -------------------- EXCEPTION HANDLING --------------------
// Must be registered early in the middleware pipeline
app.UseMiddleware<GlobalExceptionHandlingMiddleware>();

app.UseHttpsRedirection();

// Add HSTS (HTTP Strict Transport Security) header for production
// Tells browsers: "Always use HTTPS for this domain"
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseStaticFiles();

app.UseRouting();

// CORS must be called after UseRouting and before UseAuthentication
app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

// 🔥 ROLE-BASED AUTHORIZATION FAILURE LOGGER (403)
app.Use(async (context, next) =>
{
    await next.Invoke();

    if (context.Response.StatusCode == 403)
    {
        var path = context.Request.Path.ToString();
        var user = context.User.Identity?.Name ?? "Anonymous";
        var roles = context.User.FindAll(ClaimTypes.Role).Select(c => c.Value);

        Log.Warning(
            "[AUTH] 403 FORBIDDEN | Path={Path} | User={User} | Roles={Roles} | IsAuthenticated={IsAuth}",
            path,
            user,
            roles.Any() ? string.Join(",", roles) : "NO ROLES",
            context.User.Identity?.IsAuthenticated ?? false
        );
    }
});

// 🔥 AUTHORIZATION FAILURE LOGGER (all requests)
app.UseMiddleware<AuthorizationLoggingMiddleware>();

app.MapControllers();

app.Run();

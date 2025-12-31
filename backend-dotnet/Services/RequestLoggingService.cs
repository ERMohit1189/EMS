using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Serilog;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

namespace VendorRegistrationBackend.Services;

/// <summary>
/// Dedicated service for logging ALL HTTP requests to the database
/// Uses its own DbContext to avoid scope issues with the main application context
/// </summary>
public class RequestLoggingService
{
    private readonly IDbContextFactory<AppDbContext> _contextFactory;

    public RequestLoggingService(IDbContextFactory<AppDbContext> contextFactory)
    {
        _contextFactory = contextFactory;
    }

    public async Task LogRequestAsync(HttpContext context, string eventType, int statusCode)
    {
        try
        {
            // Create a fresh DbContext for logging
            using var db = _contextFactory.CreateDbContext();

            var user = context.User;
            var roles = user.Claims
                .Where(c => c.Type == ClaimTypes.Role)
                .Select(c => c.Value);

            var claims = user.Claims
                .Select(c => $"{c.Type}={c.Value}");

            var log = new AuthAuditLog
            {
                EventType = eventType,
                Path = context.Request.Path,
                QueryString = context.Request.QueryString.ToString(),
                Method = context.Request.Method,
                UserId = user.FindFirstValue(ClaimTypes.NameIdentifier),
                UserName = user.Identity?.Name,
                Email = context.Request.Path.ToString().Contains("/employees/login") ||
                        context.Request.Path.ToString().Contains("/vendors/login")
                        ? user.Identity?.Name : null,
                IsAuthenticated = user.Identity?.IsAuthenticated ?? false,
                Roles = roles.Any() ? string.Join(",", roles) : null,
                Claims = claims.Any() ? string.Join(" | ", claims) : null,
                IpAddress = context.Connection.RemoteIpAddress?.ToString(),
                UserAgent = context.Request.Headers["User-Agent"].ToString(),
                AuthStatus = statusCode >= 400 ? "Failed" : "Success",
                FailureReason = GetFailureReason(eventType, statusCode)
            };

            db.AuthAuditLogs.Add(log);
            await db.SaveChangesAsync();

            Log.Information("[RequestLoggingService] ✓ Logged {Method} {Path} -> {StatusCode}",
                context.Request.Method, context.Request.Path, statusCode);
        }
        catch (Exception ex)
        {
            Log.Error(ex, "[RequestLoggingService] ✗ FAILED to log {Path} {Method} -> {StatusCode}\nError: {ErrorMsg}",
                context.Request.Path, context.Request.Method, statusCode, ex.Message);
        }
    }

    private string GetFailureReason(string eventType, int statusCode)
    {
        return eventType switch
        {
            "UNAUTHORIZED" => "User not authenticated (401)",
            "FORBIDDEN" => "User not authorized (403)",
            "BAD_REQUEST" => "Bad request - invalid input (400)",
            "NOT_FOUND" => "Endpoint not found (404)",
            "SERVER_ERROR" => $"Server error ({statusCode})",
            _ => $"Status code {statusCode}"
        };
    }
}

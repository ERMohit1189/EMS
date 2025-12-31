using System.Security.Claims;
using VendorRegistrationBackend.Data;
using VendorRegistrationBackend.Models;

public class AuthAuditService : IAuthAuditService
{
    private readonly AppDbContext _db;

    public AuthAuditService(AppDbContext db)
    {
        _db = db;
    }

    public async Task LogAsync(HttpContext context, string eventType)
    {
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
            IsAuthenticated = user.Identity?.IsAuthenticated ?? false,
            Roles = roles.Any() ? string.Join(",", roles) : null,
            Claims = claims.Any() ? string.Join(" | ", claims) : null,
            IpAddress = context.Connection.RemoteIpAddress?.ToString(),
            UserAgent = context.Request.Headers["User-Agent"].ToString()
        };

        _db.AuthAuditLogs.Add(log);
        await _db.SaveChangesAsync();
    }

    public async Task LogAuthAttemptAsync(HttpContext context, string userType, string email, string authStatus, string? failureReason = null, string? userId = null)
    {
        try
        {
            var log = new AuthAuditLog
            {
                EventType = "LOGIN_ATTEMPT",
                Path = context.Request.Path,
                QueryString = context.Request.QueryString.ToString(),
                Method = context.Request.Method,
                UserId = userId,
                Email = email,
                UserName = email,
                IsAuthenticated = false,
                UserType = userType,
                AuthStatus = authStatus,
                FailureReason = failureReason,
                IpAddress = context.Connection.RemoteIpAddress?.ToString(),
                UserAgent = context.Request.Headers["User-Agent"].ToString()
            };

            _db.AuthAuditLogs.Add(log);
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Serilog.Log.Error(ex, "[AuthAuditService] Failed to log auth attempt for {Email}", email);
            // Don't throw - logging failure shouldn't block authentication
        }
    }
}

using VendorRegistrationBackend.Models;

public interface IAuthAuditService
{
    Task LogAsync(HttpContext context, string eventType);
    Task LogAuthAttemptAsync(HttpContext context, string userType, string email, string authStatus, string? failureReason = null, string? userId = null);
}
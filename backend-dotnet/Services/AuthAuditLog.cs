namespace VendorRegistrationBackend.Models;

public class AuthAuditLog
{
    public long Id { get; set; }

    public string EventType { get; set; } = null!;
    public string? Path { get; set; }  // Endpoint path (e.g., /api/employees/login)
    public string? QueryString { get; set; }  // Query parameters if any
    public string? Method { get; set; }  // HTTP method (GET, POST, etc.)

    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public string? Email { get; set; }

    public bool IsAuthenticated { get; set; }

    public string? Roles { get; set; }
    public string? Claims { get; set; }

    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    // Authentication-specific fields
    public string? UserType { get; set; } // "Employee" or "Vendor"
    public string? AuthStatus { get; set; } // "Success" or "Failed"
    public string? FailureReason { get; set; } // "InvalidCredentials", "UserNotFound", "InactiveUser", "BCryptException", etc.

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

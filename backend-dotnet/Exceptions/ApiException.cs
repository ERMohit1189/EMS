namespace VendorRegistrationBackend.Exceptions;

/// <summary>
/// Custom exception for API errors
/// Provides structured error responses
/// </summary>
public class ApiException : Exception
{
    public int StatusCode { get; set; }
    public string ErrorCode { get; set; }
    public object? Errors { get; set; }

    public ApiException(
        string message,
        int statusCode = 500,
        string errorCode = "INTERNAL_ERROR",
        object? errors = null,
        Exception? innerException = null)
        : base(message, innerException)
    {
        StatusCode = statusCode;
        ErrorCode = errorCode;
        Errors = errors;
    }
}

/// <summary>
/// Exception for resource not found (404)
/// </summary>
public class NotFoundException : ApiException
{
    public NotFoundException(string message, string? resource = null)
        : base(message, 404, "NOT_FOUND", new { resource })
    {
    }
}

/// <summary>
/// Exception for validation errors (400)
/// </summary>
public class ValidationException : ApiException
{
    public ValidationException(string message, object? errors = null)
        : base(message, 400, "VALIDATION_ERROR", errors)
    {
    }
}

/// <summary>
/// Exception for database errors
/// </summary>
public class DatabaseException : ApiException
{
    public DatabaseException(string message, Exception? innerException = null)
        : base(
            "An error occurred while accessing the database",
            500,
            "DATABASE_ERROR",
            null,
            innerException)
    {
    }
}

/// <summary>
/// Exception for unauthorized access (401)
/// </summary>
public class UnauthorizedException : ApiException
{
    public UnauthorizedException(string message = "Unauthorized")
        : base(message, 401, "UNAUTHORIZED")
    {
    }
}

/// <summary>
/// Exception for forbidden access (403)
/// </summary>
public class ForbiddenException : ApiException
{
    public ForbiddenException(string message = "Forbidden")
        : base(message, 403, "FORBIDDEN")
    {
    }
}

/// <summary>
/// Exception for duplicate resource (409)
/// </summary>
public class DuplicateException : ApiException
{
    public DuplicateException(string message, string? resource = null)
        : base(message, 409, "DUPLICATE_RESOURCE", new { resource })
    {
    }
}

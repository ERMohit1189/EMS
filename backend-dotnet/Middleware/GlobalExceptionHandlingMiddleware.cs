using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Serilog;
using VendorRegistrationBackend.Exceptions;

namespace VendorRegistrationBackend.Middleware;

/// <summary>
/// Global exception handling middleware
/// Catches all unhandled exceptions and returns appropriate HTTP responses
/// </summary>
public class GlobalExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;

    public GlobalExceptionHandlingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var response = new ErrorResponse();
        var exceptionType = exception.GetType().Name;

        Log.Error(exception, "[EXCEPTION] {Type} | Path={Path} | Message={Message}",
            exceptionType, context.Request.Path, exception.Message);

        switch (exception)
        {
            // ========== CUSTOM API EXCEPTIONS ==========
            case ApiException apiEx:
                context.Response.StatusCode = apiEx.StatusCode;
                response = new ErrorResponse
                {
                    Success = false,
                    Message = apiEx.Message,
                    ErrorCode = apiEx.ErrorCode,
                    StatusCode = apiEx.StatusCode,
                    Errors = apiEx.Errors,
                    Timestamp = DateTime.UtcNow
                };
                Log.Warning("[API_EXCEPTION] {ErrorCode} | {Message} | Path={Path}",
                    apiEx.ErrorCode, apiEx.Message, context.Request.Path);
                break;

            // ========== DATABASE EXCEPTIONS ==========
            // NOTE: DbUpdateConcurrencyException must come BEFORE DbUpdateException (inheritance)
            case DbUpdateConcurrencyException dbConcurrencyEx:
                context.Response.StatusCode = (int)HttpStatusCode.Conflict;
                response = new ErrorResponse
                {
                    Success = false,
                    Message = "Concurrency conflict: The record has been modified by another user",
                    ErrorCode = "CONCURRENCY_ERROR",
                    StatusCode = 409,
                    Timestamp = DateTime.UtcNow
                };
                Log.Warning(dbConcurrencyEx, "[CONCURRENCY_ERROR] | Path={Path}",
                    context.Request.Path);
                break;

            case DbUpdateException dbEx:
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                response = new ErrorResponse
                {
                    Success = false,
                    Message = "Database update failed",
                    ErrorCode = "DATABASE_UPDATE_ERROR",
                    StatusCode = 400,
                    Errors = GetDbUpdateErrorDetails(dbEx),
                    Timestamp = DateTime.UtcNow
                };
                Log.Error(dbEx, "[DB_UPDATE_ERROR] Failed to update database | Path={Path}",
                    context.Request.Path);
                break;

            case InvalidOperationException invOpEx when invOpEx.Message.Contains("DbContext"):
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                response = new ErrorResponse
                {
                    Success = false,
                    Message = "Database connection error",
                    ErrorCode = "DB_CONNECTION_ERROR",
                    StatusCode = 500,
                    Timestamp = DateTime.UtcNow
                };
                Log.Error(invOpEx, "[DB_CONNECTION_ERROR] | Path={Path}",
                    context.Request.Path);
                break;

            case TimeoutException timeoutEx:
                context.Response.StatusCode = (int)HttpStatusCode.RequestTimeout;
                response = new ErrorResponse
                {
                    Success = false,
                    Message = "Database operation timed out. Please try again.",
                    ErrorCode = "TIMEOUT_ERROR",
                    StatusCode = 408,
                    Timestamp = DateTime.UtcNow
                };
                Log.Warning(timeoutEx, "[TIMEOUT_ERROR] Database operation timed out | Path={Path}",
                    context.Request.Path);
                break;

            // ========== ARGUMENT/VALIDATION EXCEPTIONS ==========
            // NOTE: ArgumentNullException must come BEFORE ArgumentException (inheritance)
            case ArgumentNullException argNullEx:
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                response = new ErrorResponse
                {
                    Success = false,
                    Message = "Required field is null",
                    ErrorCode = "NULL_ARGUMENT",
                    StatusCode = 400,
                    Errors = new { paramName = argNullEx.ParamName },
                    Timestamp = DateTime.UtcNow
                };
                Log.Warning(argNullEx, "[NULL_ARGUMENT_ERROR] | Path={Path}",
                    context.Request.Path);
                break;

            case ArgumentException argEx:
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                response = new ErrorResponse
                {
                    Success = false,
                    Message = "Invalid argument",
                    ErrorCode = "INVALID_ARGUMENT",
                    StatusCode = 400,
                    Errors = new { paramName = argEx.ParamName, message = argEx.Message },
                    Timestamp = DateTime.UtcNow
                };
                Log.Warning(argEx, "[ARGUMENT_ERROR] | Path={Path}", context.Request.Path);
                break;

            // ========== UNAUTHORIZED/FORBIDDEN ==========
            case UnauthorizedAccessException unauthorizedEx:
                context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                response = new ErrorResponse
                {
                    Success = false,
                    Message = "Unauthorized access",
                    ErrorCode = "UNAUTHORIZED",
                    StatusCode = 401,
                    Timestamp = DateTime.UtcNow
                };
                Log.Warning(unauthorizedEx, "[UNAUTHORIZED] | Path={Path}", context.Request.Path);
                break;

            // ========== GENERIC EXCEPTIONS ==========
            default:
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                response = new ErrorResponse
                {
                    Success = false,
                    Message = "An unexpected error occurred",
                    ErrorCode = "INTERNAL_ERROR",
                    StatusCode = 500,
                    // Only include detailed error in Development
                    Errors = context.RequestServices.GetService<IWebHostEnvironment>()?.IsDevelopment() == true
                        ? new { type = exceptionType, details = exception.Message }
                        : null,
                    Timestamp = DateTime.UtcNow
                };
                Log.Error(exception, "[UNHANDLED_EXCEPTION] {Type} | Path={Path} | Message={Message}",
                    exceptionType, context.Request.Path, exception.Message);
                break;
        }

        // Always log the full exception details
        if (exception.InnerException != null)
        {
            Log.Error(exception.InnerException, "[INNER_EXCEPTION]");
        }

        return context.Response.WriteAsJsonAsync(response);
    }

    /// <summary>
    /// Extract detailed error information from DbUpdateException
    /// </summary>
    private static object? GetDbUpdateErrorDetails(DbUpdateException ex)
    {
        var errors = new List<object>();

        foreach (var entry in ex.Entries)
        {
            var error = new
            {
                Entity = entry.Entity.GetType().Name,
                State = entry.State.ToString(),
                Errors = entry.CurrentValues?.Properties
                    .Select(p => new { Property = p.Name })
                    .ToList()
            };
            errors.Add(error);
        }

        return errors.Any() ? errors : null;
    }
}

/// <summary>
/// Standard error response format
/// </summary>
public class ErrorResponse
{
    public bool Success { get; set; } = false;
    public string? Message { get; set; }
    public string? ErrorCode { get; set; }
    public int StatusCode { get; set; } = 500;
    public object? Errors { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Standard success response format
/// </summary>
public class SuccessResponse<T>
{
    public bool Success { get; set; } = true;
    public T? Data { get; set; }
    public string? Message { get; set; }
    public int StatusCode { get; set; } = 200;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

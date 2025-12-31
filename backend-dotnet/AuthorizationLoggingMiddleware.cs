using Serilog;
using VendorRegistrationBackend.Services;

public class AuthorizationLoggingMiddleware
{
    private readonly RequestDelegate _next;

    public AuthorizationLoggingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, RequestLoggingService loggingService)
    {
        var path = context.Request.Path.ToString();
        var method = context.Request.Method;

        Log.Debug("[MIDDLEWARE] [REQUEST] {Method} {Path}", method, path);

        try
        {
            // Process the request
            await _next(context);
        }
        catch (Exception ex)
        {
            Log.Error(ex, "[MIDDLEWARE] [EXCEPTION] {Method} {Path}", method, path);
            throw;
        }

        // Get response status
        var statusCode = context.Response.StatusCode;
        Log.Debug("[MIDDLEWARE] [RESPONSE] {Method} {Path} -> {StatusCode}", method, path, statusCode);

        // Log to database - only skip static files
        if (!IsStaticFile(path))
        {
            try
            {
                string eventType = GetEventType(statusCode);
                Log.Debug("[MIDDLEWARE] [LOGGING] {EventType} for {Path}", eventType, path);

                // Use the RequestLoggingService with its own DbContext
                await loggingService.LogRequestAsync(context, eventType, statusCode);

                Log.Information("[MIDDLEWARE] [SAVED] {Method} {Path} -> {StatusCode}", method, path, statusCode);
            }
            catch (Exception logEx)
            {
                Log.Error(logEx, "[MIDDLEWARE] [FAILED] Could not log {Method} {Path}", method, path);
            }
        }
        else
        {
            Log.Debug("[MIDDLEWARE] [SKIP] Static file: {Path}", path);
        }
    }

    private bool IsStaticFile(string path)
    {
        // Skip only actual static files, not API endpoints
        return path.EndsWith(".css") || path.EndsWith(".js") || path.EndsWith(".png") ||
               path.EndsWith(".jpg") || path.EndsWith(".gif") || path.EndsWith(".ico") ||
               path.EndsWith(".woff") || path.EndsWith(".ttf") || path.EndsWith(".svg") ||
               path.EndsWith(".eot") || path.EndsWith(".map");
    }

    private string GetEventType(int statusCode)
    {
        return statusCode switch
        {
            200 => "SUCCESS",
            201 => "CREATED",
            204 => "NO_CONTENT",
            301 => "REDIRECT",
            302 => "REDIRECT",
            304 => "NOT_MODIFIED",
            400 => "BAD_REQUEST",
            401 => "UNAUTHORIZED",
            403 => "FORBIDDEN",
            404 => "NOT_FOUND",
            500 => "SERVER_ERROR",
            502 => "BAD_GATEWAY",
            503 => "SERVICE_UNAVAILABLE",
            _ => $"HTTP_{statusCode}"
        };
    }
}

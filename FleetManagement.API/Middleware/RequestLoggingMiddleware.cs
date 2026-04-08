using System.Diagnostics;
using System.Security.Claims;
using Serilog.Context;

namespace FleetManagement.API.Middleware;

public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    private static readonly HashSet<string> ExcludedPathPrefixes = new(StringComparer.OrdinalIgnoreCase)
    {
        "/health",
        "/swagger",
        "/favicon.ico"
    };

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        if (IsExcluded(path))
        {
            await _next(context);
            return;
        }

        var correlationId = context.Request.Headers["X-Correlation-Id"].FirstOrDefault()
                            ?? Guid.NewGuid().ToString();

        context.Items["CorrelationId"] = correlationId;
        context.Response.Headers["X-Correlation-Id"] = correlationId;

        var sw = Stopwatch.StartNew();

        using (LogContext.PushProperty("CorrelationId", correlationId))
        using (LogContext.PushProperty("RequestMethod", context.Request.Method))
        using (LogContext.PushProperty("RequestPath", path))
        using (LogContext.PushProperty("QueryString", context.Request.QueryString.ToString()))
        using (LogContext.PushProperty("UserAgent", context.Request.Headers.UserAgent.ToString()))
        using (LogContext.PushProperty("ClientIp", GetClientIp(context)))
        {
            try
            {
                await _next(context);
            }
            finally
            {
                sw.Stop();

                var userId   = GetUserId(context);
                var userRole = GetUserRole(context);

                using (LogContext.PushProperty("UserId", userId))
                using (LogContext.PushProperty("UserRole", userRole))
                using (LogContext.PushProperty("StatusCode", context.Response.StatusCode))
                using (LogContext.PushProperty("ElapsedMs", sw.ElapsedMilliseconds))
                using (LogContext.PushProperty("ContentType", context.Response.ContentType ?? ""))
                using (LogContext.PushProperty("RequestContentLength", context.Request.ContentLength ?? 0))
                {
                    var statusCode = context.Response.StatusCode;
                    var elapsed    = sw.ElapsedMilliseconds;

                    if (statusCode >= 500)
                    {
                        _logger.LogError(
                            "HTTP {Method} {Path} → {StatusCode} in {ElapsedMs}ms [User:{UserId} Role:{UserRole} IP:{ClientIp}]",
                            context.Request.Method, path, statusCode, elapsed, userId, userRole, GetClientIp(context));
                    }
                    else if (statusCode >= 400)
                    {
                        _logger.LogWarning(
                            "HTTP {Method} {Path} → {StatusCode} in {ElapsedMs}ms [User:{UserId}]",
                            context.Request.Method, path, statusCode, elapsed, userId);
                    }
                    else if (elapsed > 500)
                    {
                        _logger.LogWarning(
                            "SLOW HTTP {Method} {Path} → {StatusCode} in {ElapsedMs}ms [User:{UserId}]",
                            context.Request.Method, path, statusCode, elapsed, userId);
                    }
                    else
                    {
                        _logger.LogInformation(
                            "HTTP {Method} {Path} → {StatusCode} in {ElapsedMs}ms",
                            context.Request.Method, path, statusCode, elapsed);
                    }
                }
            }
        }
    }

    private static bool IsExcluded(string path)
    {
        foreach (var prefix in ExcludedPathPrefixes)
            if (path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                return true;
        return false;
    }

    private static string GetClientIp(HttpContext context)
    {
        var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
            return forwarded.Split(',')[0].Trim();
        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private static string GetUserId(HttpContext context)
    {
        if (context.User?.Identity?.IsAuthenticated != true) return "anonymous";
        return context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? context.User.FindFirst("sub")?.Value
               ?? "anonymous";
    }

    private static string GetUserRole(HttpContext context)
    {
        if (context.User?.Identity?.IsAuthenticated != true) return "none";
        return context.User.FindFirst(ClaimTypes.Role)?.Value
               ?? context.User.FindFirst("role")?.Value
               ?? "unknown";
    }
}

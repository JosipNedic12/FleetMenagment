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
        {
            await _next(context);

            sw.Stop();

            var method     = context.Request.Method;
            var statusCode = context.Response.StatusCode;
            var elapsed    = sw.ElapsedMilliseconds;
            var clientIp   = GetClientIp(context);
            var userId     = GetUserId(context);

            LogRequest(method, path, statusCode, elapsed, clientIp, userId, correlationId);
        }
    }

    private void LogRequest(string method, string path, int statusCode, long elapsedMs,
                            string clientIp, string userId, string correlationId)
    {
        const string template =
            "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMs}ms | IP={ClientIp} User={UserId} CorrelationId={CorrelationId}";

        if (statusCode >= 500)
            _logger.LogError(template, method, path, statusCode, elapsedMs, clientIp, userId, correlationId);
        else if (statusCode >= 400)
            _logger.LogWarning(template, method, path, statusCode, elapsedMs, clientIp, userId, correlationId);
        else
            _logger.LogInformation(template, method, path, statusCode, elapsedMs, clientIp, userId, correlationId);
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
        // Respect forwarded header when behind a proxy/load balancer
        var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
            return forwarded.Split(',')[0].Trim();

        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private static string GetUserId(HttpContext context)
    {
        var user = context.User;
        if (user?.Identity?.IsAuthenticated != true)
            return "anonymous";

        return user.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? user.FindFirst("sub")?.Value
               ?? "anonymous";
    }
}

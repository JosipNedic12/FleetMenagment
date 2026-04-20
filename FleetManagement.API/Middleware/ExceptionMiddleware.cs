using System.Text.Json;
using FleetManagement.Application.Exceptions;
using FleetManagement.API.Localization;
using Microsoft.Extensions.Logging;
using Serilog.Context;

namespace FleetManagement.API.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Items.TryGetValue("CorrelationId", out var cid)
            ? cid?.ToString() ?? Guid.NewGuid().ToString()
            : Guid.NewGuid().ToString();
        if (!context.Response.HasStarted)
            context.Response.Headers["X-Correlation-Id"] = correlationId;

        var lang = ResolveLanguage(context);

        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            try
            {
                await _next(context);
            }
            catch (NotFoundException ex)
            {
                _logger.LogWarning("NotFound: {Message} | Path={Path}", ex.Message, context.Request.Path);
                var msg = ErrorMessages.Get(ex.Message, lang);
                await WriteResponse(context, 404, msg, correlationId);
            }
            catch (ConflictException ex)
            {
                _logger.LogWarning("Conflict: {Message} | Path={Path}", ex.Message, context.Request.Path);
                var msg = ErrorMessages.Get(ex.Message, lang);
                await WriteResponse(context, 409, msg, correlationId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Unhandled {ExceptionType}: {ExceptionMessage} | Method={Method} Path={Path}",
                    ex.GetType().Name,
                    ex.Message,
                    context.Request.Method,
                    context.Request.Path);
                var msg = lang.StartsWith("hr") ? "Došlo je do neočekivane greške." : "An unexpected error occurred.";
                await WriteResponse(context, 500, msg, correlationId);
            }
        }
    }

    private static string ResolveLanguage(HttpContext context)
    {
        var accept = context.Request.Headers["Accept-Language"].ToString();
        if (!string.IsNullOrWhiteSpace(accept))
        {
            var primary = accept.Split(',')[0].Trim().Split(';')[0].Trim();
            return primary;
        }
        return "hr";
    }

    private static async Task WriteResponse(HttpContext context, int statusCode, string message, string correlationId)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        var body = JsonSerializer.Serialize(new { message, correlationId });
        await context.Response.WriteAsync(body);
    }
}

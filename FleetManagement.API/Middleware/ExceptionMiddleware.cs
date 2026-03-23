using System.Text.Json;
using FleetManagement.Application.Exceptions;
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
        // Header already set by RequestLoggingMiddleware; set here only as fallback
        if (!context.Response.HasStarted)
            context.Response.Headers["X-Correlation-Id"] = correlationId;

        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            try
            {
                await _next(context);
            }
            catch (NotFoundException ex)
            {
                _logger.LogWarning(ex.Message);
                await WriteResponse(context, 404, ex.Message, correlationId);
            }
            catch (ConflictException ex)
            {
                _logger.LogWarning(ex.Message);
                await WriteResponse(context, 409, ex.Message, correlationId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled exception. Method={Method} Path={Path} CorrelationId={CorrelationId}",
                    context.Request.Method, context.Request.Path, correlationId);
                await WriteResponse(context, 500, "An unexpected error occurred.", correlationId);
            }
        }
    }

    private static async Task WriteResponse(HttpContext context, int statusCode, string message, string correlationId)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        var body = JsonSerializer.Serialize(new { message, correlationId });
        await context.Response.WriteAsync(body);
    }
}

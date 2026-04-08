using FleetManagement.Application.DTOs;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Services;

public class UserActivityService
{
    private readonly FleetDbContext _db;

    public UserActivityService(FleetDbContext db) => _db = db;

    public async Task LogAsync(int userId, string action, string entityType, int? entityId, string description)
    {
        _db.UserActivityLogs.Add(new UserActivityLog
        {
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Description = description,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    public async Task<List<ActivityLogDto>> GetUserActivityAsync(int userId, int count = 20)
        => await _db.UserActivityLogs
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(count)
            .Select(x => new ActivityLogDto(
                x.ActivityLogId,
                x.Action,
                x.EntityType,
                x.EntityId,
                x.Description,
                x.CreatedAt))
            .ToListAsync();
}

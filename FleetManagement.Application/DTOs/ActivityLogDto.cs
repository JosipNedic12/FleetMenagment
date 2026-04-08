namespace FleetManagement.Application.DTOs;

public record ActivityLogDto(
    int ActivityLogId,
    string Action,
    string EntityType,
    int? EntityId,
    string Description,
    DateTime CreatedAt
);

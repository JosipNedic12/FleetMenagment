namespace FleetManagement.Domain.Entities;

public class UserActivityLog
{
    public int ActivityLogId { get; set; }
    public int UserId { get; set; }
    public string Action { get; set; } = "";
    public string EntityType { get; set; } = "";
    public int? EntityId { get; set; }
    public string Description { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}

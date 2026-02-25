namespace FleetManagement.Domain.Entities;

public class Inspection
{
    public int InspectionId { get; set; }
    public int VehicleId { get; set; }
    public DateOnly InspectedAt { get; set; }
    public DateOnly? ValidTo { get; set; }
    // "passed" | "failed" | "conditional"
    public string Result { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public int? OdometerKm { get; set; }

    public DateTime CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }

    // Navigation
    public Vehicle Vehicle { get; set; } = null!;
}
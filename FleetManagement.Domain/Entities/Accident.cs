namespace FleetManagement.Domain.Entities;

public class Accident
{
    public int AccidentId { get; set; }
    public int VehicleId { get; set; }
    public int? DriverId { get; set; }
    public DateTime OccurredAt { get; set; }
    // "minor" | "major" | "total"
    public string Severity { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal? DamageEstimate { get; set; }
    public string? PoliceReport { get; set; }
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTime? ModifiedAt { get; set; }
    public Guid? ModifiedBy { get; set; }

    // Navigation
    public Vehicle Vehicle { get; set; } = null!;
    public Driver? Driver { get; set; }
}
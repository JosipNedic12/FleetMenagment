namespace FleetManagement.Application.DTOs;

public class AccidentDto
{
    public int AccidentId { get; set; }
    public int VehicleId { get; set; }
    public string RegistrationNumber { get; set; } = string.Empty;
    public int? DriverId { get; set; }
    public string? DriverName { get; set; }
    public DateTime OccurredAt { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal? DamageEstimate { get; set; }
    public string? PoliceReport { get; set; }
    public string? Notes { get; set; }
}

public class CreateAccidentDto
{
    public int VehicleId { get; set; }
    public int? DriverId { get; set; }
    public DateTime OccurredAt { get; set; }
    public string Severity { get; set; } = string.Empty; // minor | major | total
    public string Description { get; set; } = string.Empty;
    public decimal? DamageEstimate { get; set; }
    public string? PoliceReport { get; set; }
    public string? Notes { get; set; }
}

public class UpdateAccidentDto
{
    public int? DriverId { get; set; }
    public DateTime? OccurredAt { get; set; }
    public string? Severity { get; set; }
    public string? Description { get; set; }
    public decimal? DamageEstimate { get; set; }
    public string? PoliceReport { get; set; }
    public string? Notes { get; set; }
}
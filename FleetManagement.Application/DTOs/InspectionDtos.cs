namespace FleetManagement.Application.DTOs;

public class InspectionDto
{
    public int InspectionId { get; set; }
    public int VehicleId { get; set; }
    public string RegistrationNumber { get; set; } = string.Empty;
    public DateOnly InspectedAt { get; set; }
    public DateOnly? ValidTo { get; set; }
    public string Result { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public int? OdometerKm { get; set; }
    public bool IsValid { get; set; } // computed: ValidTo >= today
}

public class CreateInspectionDto
{
    public int VehicleId { get; set; }
    public DateOnly InspectedAt { get; set; }
    public DateOnly? ValidTo { get; set; }
    public string Result { get; set; } = string.Empty; // passed | failed | conditional
    public string? Notes { get; set; }
    public int? OdometerKm { get; set; }
}

public class UpdateInspectionDto
{
    public DateOnly? InspectedAt { get; set; }
    public DateOnly? ValidTo { get; set; }
    public string? Result { get; set; }
    public string? Notes { get; set; }
    public int? OdometerKm { get; set; }
}
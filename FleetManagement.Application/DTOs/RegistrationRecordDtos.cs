namespace FleetManagement.Application.DTOs;

public class RegistrationRecordDto
{
    public int RegistrationId { get; set; }
    public int VehicleId { get; set; }
    public string VehicleRegistrationNumber { get; set; } = string.Empty; // vehicle plate
    public string RegistrationNumber { get; set; } = string.Empty;        // reg doc number
    public DateOnly ValidFrom { get; set; }
    public DateOnly ValidTo { get; set; }
    public decimal? Fee { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } // computed: today between ValidFrom and ValidTo
}

public class CreateRegistrationRecordDto
{
    public int VehicleId { get; set; }
    public string RegistrationNumber { get; set; } = string.Empty;
    public DateOnly ValidFrom { get; set; }
    public DateOnly ValidTo { get; set; }
    public decimal? Fee { get; set; }
    public string? Notes { get; set; }
}

public class UpdateRegistrationRecordDto
{
    public string? RegistrationNumber { get; set; }
    public DateOnly? ValidFrom { get; set; }
    public DateOnly? ValidTo { get; set; }
    public decimal? Fee { get; set; }
    public string? Notes { get; set; }
}
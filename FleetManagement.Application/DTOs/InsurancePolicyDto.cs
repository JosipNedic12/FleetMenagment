namespace FleetManagement.Application.DTOs;

public class InsurancePolicyDto
{
    public int PolicyId { get; set; }
    public int VehicleId { get; set; }
    public string RegistrationNumber { get; set; } = string.Empty; // from join
    public string PolicyNumber { get; set; } = string.Empty;
    public string Insurer { get; set; } = string.Empty;
    public DateOnly ValidFrom { get; set; }
    public DateOnly ValidTo { get; set; }
    public decimal Premium { get; set; }
    public string? CoverageNotes { get; set; }
    public bool IsActive { get; set; } // computed: ValidTo >= today
}

public class CreateInsurancePolicyDto
{
    public int VehicleId { get; set; }
    public string PolicyNumber { get; set; } = string.Empty;
    public string Insurer { get; set; } = string.Empty;
    public DateOnly ValidFrom { get; set; }
    public DateOnly ValidTo { get; set; }
    public decimal Premium { get; set; }
    public string? CoverageNotes { get; set; }
}

public class UpdateInsurancePolicyDto
{
    public string? Insurer { get; set; }
    public DateOnly? ValidFrom { get; set; }
    public DateOnly? ValidTo { get; set; }
    public decimal? Premium { get; set; }
    public string? CoverageNotes { get; set; }
}
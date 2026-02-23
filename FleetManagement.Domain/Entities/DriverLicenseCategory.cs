namespace FleetManagement.Domain.Entities;

public class DriverLicenseCategory
{
    public int DriverId { get; set; }
    public int LicenseCategoryId { get; set; }
    public DateOnly? ObtainedDate { get; set; }

    // Navigation
    public Driver Driver { get; set; } = null!;
    public DcLicenseCategory LicenseCategory { get; set; } = null!;
}
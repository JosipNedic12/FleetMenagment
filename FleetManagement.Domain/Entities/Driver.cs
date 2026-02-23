namespace FleetManagement.Domain.Entities;

public class Driver
{
    public int DriverId { get; set; }
    public int EmployeeId { get; set; }
    public string LicenseNumber { get; set; } = string.Empty;
    public DateOnly LicenseExpiry { get; set; }
    public string? Notes { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTime? ModifiedAt { get; set; }
    public Guid? ModifiedBy { get; set; }

    // Navigation
    public Employee Employee { get; set; } = null!;
    public ICollection<DriverLicenseCategory> LicenseCategories { get; set; } = new List<DriverLicenseCategory>();
}
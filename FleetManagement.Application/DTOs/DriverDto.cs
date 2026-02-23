namespace FleetManagement.Application.DTOs;

public class DriverDto
{
    public int DriverId { get; set; }
    public int EmployeeId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string LicenseNumber { get; set; } = string.Empty;
    public DateOnly LicenseExpiry { get; set; }
    public bool LicenseExpired => LicenseExpiry < DateOnly.FromDateTime(DateTime.Today);
    public List<string> LicenseCategories { get; set; } = new();
    public string? Notes { get; set; }
}

public class CreateDriverDto
{
    public int EmployeeId { get; set; }
    public string LicenseNumber { get; set; } = string.Empty;
    public DateOnly LicenseExpiry { get; set; }
    public List<int> LicenseCategoryIds { get; set; } = new();
    public string? Notes { get; set; }
}

public class UpdateDriverDto
{
    public string? LicenseNumber { get; set; }
    public DateOnly? LicenseExpiry { get; set; }
    public List<int>? LicenseCategoryIds { get; set; }
    public string? Notes { get; set; }
}
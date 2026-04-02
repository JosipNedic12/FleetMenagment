namespace FleetManagement.Application.Common.Filters;

public class DriverFilter
{
    public string? LicenseStatus { get; set; }  // valid, expired, expiring_soon
    public string? Department { get; set; }
}

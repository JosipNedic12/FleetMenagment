namespace FleetManagement.Domain.Entities;

public class DcLicenseCategory
{
    public int LicenseCategoryId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
}
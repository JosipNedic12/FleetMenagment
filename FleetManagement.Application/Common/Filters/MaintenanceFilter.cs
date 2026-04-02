namespace FleetManagement.Application.Common.Filters;

public class MaintenanceFilter
{
    public string? Status { get; set; }        // open, in_progress, closed, cancelled
    public int? VehicleId { get; set; }
    public int? VendorId { get; set; }
    public int? MaintenanceTypeId { get; set; }
    public DateOnly? DateFrom { get; set; }
    public DateOnly? DateTo { get; set; }
}

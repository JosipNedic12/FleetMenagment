namespace FleetManagement.Application.Common.Filters;

public class FineFilter
{
    public string? PaidStatus { get; set; }  // paid, unpaid
    public int? VehicleId { get; set; }
    public int? DriverId { get; set; }
    public DateOnly? DateFrom { get; set; }
    public DateOnly? DateTo { get; set; }
}

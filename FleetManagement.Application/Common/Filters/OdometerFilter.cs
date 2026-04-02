namespace FleetManagement.Application.Common.Filters;

public class OdometerFilter
{
    public int? VehicleId { get; set; }
    public DateOnly? DateFrom { get; set; }
    public DateOnly? DateTo { get; set; }
}

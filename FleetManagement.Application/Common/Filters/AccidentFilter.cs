namespace FleetManagement.Application.Common.Filters;

public class AccidentFilter
{
    public string? Severity { get; set; }  // minor, moderate, severe
    public int? VehicleId { get; set; }
    public int? DriverId { get; set; }
    public DateOnly? DateFrom { get; set; }
    public DateOnly? DateTo { get; set; }
}

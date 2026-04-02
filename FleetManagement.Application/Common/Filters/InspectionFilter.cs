namespace FleetManagement.Application.Common.Filters;

public class InspectionFilter
{
    public string? Result { get; set; }  // passed, failed
    public int? VehicleId { get; set; }
    public DateOnly? DateFrom { get; set; }
    public DateOnly? DateTo { get; set; }
}

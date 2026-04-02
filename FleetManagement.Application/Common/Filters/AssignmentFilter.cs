namespace FleetManagement.Application.Common.Filters;

public class AssignmentFilter
{
    public string? Status { get; set; }  // active, ended
    public int? VehicleId { get; set; }
    public int? DriverId { get; set; }
}

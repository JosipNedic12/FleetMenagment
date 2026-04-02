namespace FleetManagement.Application.Common.Filters;

public class FuelCardFilter
{
    public string? Status { get; set; }  // active, inactive, expired
    public int? VehicleId { get; set; }
    public string? Provider { get; set; }
}

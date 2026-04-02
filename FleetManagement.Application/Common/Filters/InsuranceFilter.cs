namespace FleetManagement.Application.Common.Filters;

public class InsuranceFilter
{
    public string? Status { get; set; }  // active, expired
    public int? VehicleId { get; set; }
    public string? Insurer { get; set; }
}

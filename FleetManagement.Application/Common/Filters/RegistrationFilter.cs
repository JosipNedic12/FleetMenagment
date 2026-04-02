namespace FleetManagement.Application.Common.Filters;

public class RegistrationFilter
{
    public string? Status { get; set; }  // valid, expired
    public int? VehicleId { get; set; }
}

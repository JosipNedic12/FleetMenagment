namespace FleetManagement.Application.Common.Filters;

public class VehicleFilter
{
    public string? Status { get; set; }        // active, service, retired, sold
    public int? MakeId { get; set; }
    public int? CategoryId { get; set; }
    public int? FuelTypeId { get; set; }
    public int? YearFrom { get; set; }
    public int? YearTo { get; set; }
}

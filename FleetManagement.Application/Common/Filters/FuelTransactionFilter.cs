namespace FleetManagement.Application.Common.Filters;

public class FuelTransactionFilter
{
    public int? VehicleId { get; set; }
    public int? FuelCardId { get; set; }
    public int? FuelTypeId { get; set; }
    public DateOnly? DateFrom { get; set; }
    public DateOnly? DateTo { get; set; }
}

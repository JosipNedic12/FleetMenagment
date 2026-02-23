namespace FleetManagement.Domain.Entities;

public class DcFuelType
{
    public int FuelTypeId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public bool IsElectric { get; set; }
    public bool IsActive { get; set; }
}
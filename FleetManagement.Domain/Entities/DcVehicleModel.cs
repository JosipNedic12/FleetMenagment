namespace FleetManagement.Domain.Entities;

public class DcVehicleModel
{
    public int ModelId { get; set; }
    public int MakeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DcVehicleMake Make { get; set; } = null!;
}
namespace FleetManagement.Domain.Entities;

public class DcVehicleMake
{
    public int MakeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public ICollection<DcVehicleModel> Models { get; set; } = new List<DcVehicleModel>();
}
namespace FleetManagement.Domain.Entities;

public class Vehicle
{
    public int VehicleId { get; set; }
    public string RegistrationNumber { get; set; } = string.Empty;
    public string Vin { get; set; } = string.Empty;
    public int MakeId { get; set; }
    public int ModelId { get; set; }
    public int CategoryId { get; set; }
    public int FuelTypeId { get; set; }
    public short Year { get; set; }
    public string? Color { get; set; }
    public string Status { get; set; } = "active";
    public int CurrentOdometerKm { get; set; }
    public string? Notes { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTime? ModifiedAt { get; set; }
    public Guid? ModifiedBy { get; set; }

    // Navigation properties (EF Core uses these for JOINs)
    public DcVehicleMake Make { get; set; } = null!;
    public DcVehicleModel Model { get; set; } = null!;
    public DcVehicleCategory Category { get; set; } = null!;
    public DcFuelType FuelType { get; set; } = null!;
}
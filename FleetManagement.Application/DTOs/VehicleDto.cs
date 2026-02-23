namespace FleetManagement.Application.DTOs;

// What we RETURN to the frontend
public class VehicleDto
{
    public int VehicleId { get; set; }
    public string RegistrationNumber { get; set; } = string.Empty;
    public string Vin { get; set; } = string.Empty;
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string FuelType { get; set; } = string.Empty;
    public short Year { get; set; }
    public string? Color { get; set; }
    public string Status { get; set; } = string.Empty;
    public int CurrentOdometerKm { get; set; }
    public string? Notes { get; set; }
}

// What we RECEIVE when creating a vehicle
public class CreateVehicleDto
{
    public string RegistrationNumber { get; set; } = string.Empty;
    public string Vin { get; set; } = string.Empty;
    public int MakeId { get; set; }
    public int ModelId { get; set; }
    public int CategoryId { get; set; }
    public int FuelTypeId { get; set; }
    public short Year { get; set; }
    public string? Color { get; set; }
    public string? Notes { get; set; }
}

// What we RECEIVE when updating a vehicle
public class UpdateVehicleDto
{
    public string? Color { get; set; }
    public string? Status { get; set; }
    public string? Notes { get; set; }
}
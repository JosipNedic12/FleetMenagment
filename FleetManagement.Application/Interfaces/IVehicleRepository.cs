using FleetManagement.Domain.Entities;

namespace FleetManagement.Application.Interfaces;

public interface IVehicleRepository
{
    Task<IEnumerable<Vehicle>> GetAllAsync();
    Task<Vehicle?> GetByIdAsync(int id);
    Task<Vehicle> CreateAsync(Vehicle vehicle);
    Task<Vehicle?> UpdateAsync(int id, Vehicle vehicle);
    Task<bool> DeleteAsync(int id);  // soft delete
    Task<bool> ExistsAsync(string registrationNumber, string vin);
}
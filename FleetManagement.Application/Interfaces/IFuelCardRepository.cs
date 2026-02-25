using FleetManagement.Domain.Entities;

namespace FleetManagement.Application.Interfaces;

public interface IFuelCardRepository
{
    Task<IEnumerable<FuelCard>> GetAllAsync();
    Task<FuelCard?> GetByIdAsync(int id);
    Task<IEnumerable<FuelCard>> GetByVehicleIdAsync(int vehicleId);
    Task<FuelCard> CreateAsync(FuelCard card);
    Task<FuelCard?> UpdateAsync(int id, FuelCard updated);
    Task<bool> DeleteAsync(int id); // soft delete via IsActive = false
}
using FleetManagement.Domain.Entities;

namespace FleetManagement.Application.Interfaces;

public interface IAccidentRepository
{
    Task<IEnumerable<Accident>> GetAllAsync();
    Task<IEnumerable<Accident>> GetByVehicleIdAsync(int vehicleId);
    Task<IEnumerable<Accident>> GetByDriverIdAsync(int driverId);
    Task<Accident?> GetByIdAsync(int id);
    Task<Accident> CreateAsync(Accident accident);
    Task<Accident?> UpdateAsync(int id, Accident updated);
    Task<bool> DeleteAsync(int id);
}
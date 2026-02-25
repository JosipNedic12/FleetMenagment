using FleetManagement.Domain.Entities;

namespace FleetManagement.Application.Interfaces;
public interface IFuelTransactionRepository
{
    Task<IEnumerable<FuelTransaction>> GetAllAsync();
    Task<IEnumerable<FuelTransaction>> GetByVehicleIdAsync(int vehicleId);
    Task<FuelTransaction?> GetByIdAsync(int id);
    Task<FuelTransaction> CreateAsync(FuelTransaction transaction);
    Task<bool> DeleteAsync(int id);
    Task<bool> MarkSuspiciousAsync(int id, bool isSuspicious);
}
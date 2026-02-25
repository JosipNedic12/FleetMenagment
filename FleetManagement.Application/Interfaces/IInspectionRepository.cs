using FleetManagement.Domain.Entities;

namespace FleetManagement.Application.Interfaces;

public interface IInspectionRepository
{
    Task<IEnumerable<Inspection>> GetAllAsync();
    Task<IEnumerable<Inspection>> GetByVehicleIdAsync(int vehicleId);
    Task<Inspection?> GetByIdAsync(int id);
    Task<Inspection?> GetLatestByVehicleIdAsync(int vehicleId);
    Task<Inspection> CreateAsync(Inspection inspection);
    Task<Inspection?> UpdateAsync(int id, Inspection updated);
    Task<bool> DeleteAsync(int id);
}
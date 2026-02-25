using FleetManagement.Domain.Entities;

namespace FleetManagement.Application.Interfaces;

public interface IRegistrationRecordRepository
{
    Task<IEnumerable<RegistrationRecord>> GetAllAsync();
    Task<IEnumerable<RegistrationRecord>> GetByVehicleIdAsync(int vehicleId);
    Task<RegistrationRecord?> GetByIdAsync(int id);
    Task<RegistrationRecord?> GetCurrentByVehicleIdAsync(int vehicleId); // latest valid one
    Task<RegistrationRecord> CreateAsync(RegistrationRecord record);
    Task<RegistrationRecord?> UpdateAsync(int id, RegistrationRecord updated);
    Task<bool> DeleteAsync(int id);
}
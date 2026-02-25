using FleetManagement.Domain.Entities;

namespace FleetManagement.Application.Interfaces;

public interface IFineRepository
{
    Task<IEnumerable<Fine>> GetAllAsync();
    Task<IEnumerable<Fine>> GetByVehicleIdAsync(int vehicleId);
    Task<IEnumerable<Fine>> GetByDriverIdAsync(int driverId);
    Task<IEnumerable<Fine>> GetUnpaidAsync();
    Task<Fine?> GetByIdAsync(int id);
    Task<Fine> CreateAsync(Fine fine);
    Task<Fine?> UpdateAsync(int id, Fine updated);
    Task<Fine?> MarkPaidAsync(int id, DateTime paidAt, string? paymentMethod);
    Task<bool> DeleteAsync(int id);
}
using FleetManagement.Domain.Entities;

namespace FleetManagement.Application.Interfaces;

public interface IInsurancePolicyRepository
{
    Task<IEnumerable<InsurancePolicy>> GetAllAsync();
    Task<IEnumerable<InsurancePolicy>> GetByVehicleIdAsync(int vehicleId);
    Task<InsurancePolicy?> GetByIdAsync(int id);
    Task<InsurancePolicy> CreateAsync(InsurancePolicy policy);
    Task<InsurancePolicy?> UpdateAsync(int id, InsurancePolicy updated);
    Task<bool> DeleteAsync(int id);
    // Useful: get active (non-expired) policies
    Task<IEnumerable<InsurancePolicy>> GetActiveAsync();
}
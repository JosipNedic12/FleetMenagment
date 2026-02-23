using FleetManagement.Domain.Entities;

namespace FleetManagement.Application.Interfaces;

public interface IDriverRepository
{
    Task<IEnumerable<Driver>> GetAllAsync();
    Task<Driver?> GetByIdAsync(int id);
    Task<Driver> CreateAsync(Driver driver, List<int> licenseCategoryIds);
    Task<Driver?> UpdateAsync(int id, Driver driver, List<int>? licenseCategoryIds);
    Task<bool> DeleteAsync(int id);
    Task<bool> LicenseNumberExistsAsync(string licenseNumber);
}
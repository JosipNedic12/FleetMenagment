using FleetManagement.Domain.Entities;

namespace FleetManagement.Application.Interfaces;

public interface IVendorRepository
{
    Task<IEnumerable<Vendor>> GetAllAsync();
    Task<Vendor?> GetByIdAsync(int id);
    Task<Vendor> CreateAsync(Vendor vendor);
    Task<Vendor?> UpdateAsync(int id, Vendor updated);
    Task<bool> DeleteAsync(int id); // soft delete
}

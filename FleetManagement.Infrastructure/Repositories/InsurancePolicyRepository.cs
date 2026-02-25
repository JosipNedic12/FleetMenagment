using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Repositories;

public class InsurancePolicyRepository : IInsurancePolicyRepository
{
    private readonly FleetDbContext _context;
    public InsurancePolicyRepository(FleetDbContext context) => _context = context;

    private IQueryable<InsurancePolicy> BaseQuery() =>
        _context.InsurancePolicies.Include(p => p.Vehicle);

    public async Task<IEnumerable<InsurancePolicy>> GetAllAsync() =>
        await BaseQuery().OrderByDescending(p => p.ValidTo).ToListAsync();

    public async Task<IEnumerable<InsurancePolicy>> GetByVehicleIdAsync(int vehicleId) =>
        await BaseQuery().Where(p => p.VehicleId == vehicleId)
                         .OrderByDescending(p => p.ValidTo).ToListAsync();

    public async Task<InsurancePolicy?> GetByIdAsync(int id) =>
        await BaseQuery().FirstOrDefaultAsync(p => p.PolicyId == id);

    public async Task<IEnumerable<InsurancePolicy>> GetActiveAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return await BaseQuery().Where(p => p.ValidTo >= today).ToListAsync();
    }

    public async Task<InsurancePolicy> CreateAsync(InsurancePolicy policy)
    {
        policy.CreatedAt = DateTime.UtcNow;
        _context.InsurancePolicies.Add(policy);
        await _context.SaveChangesAsync();
        return (await BaseQuery().FirstAsync(p => p.PolicyId == policy.PolicyId));
    }

    public async Task<InsurancePolicy?> UpdateAsync(int id, InsurancePolicy updated)
    {
        var policy = await _context.InsurancePolicies.FindAsync(id);
        if (policy == null) return null;

        if (updated.Insurer != null) policy.Insurer = updated.Insurer;
        if (updated.ValidFrom != default) policy.ValidFrom = updated.ValidFrom;
        if (updated.ValidTo != default) policy.ValidTo = updated.ValidTo;
        if (updated.Premium != default) policy.Premium = updated.Premium;
        policy.CoverageNotes = updated.CoverageNotes;
        policy.ModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await BaseQuery().FirstAsync(p => p.PolicyId == id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var policy = await _context.InsurancePolicies.FindAsync(id);
        if (policy == null) return false;
        _context.InsurancePolicies.Remove(policy); // hard delete, no soft delete on policies
        await _context.SaveChangesAsync();
        return true;
    }
}
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Repositories;

public class InspectionRepository : IInspectionRepository
{
    private readonly FleetDbContext _context;
    public InspectionRepository(FleetDbContext context) => _context = context;

    private IQueryable<Inspection> BaseQuery() =>
        _context.Inspections.Include(i => i.Vehicle);

    public async Task<IEnumerable<Inspection>> GetAllAsync() =>
        await BaseQuery().OrderByDescending(i => i.InspectedAt).ToListAsync();

    public async Task<IEnumerable<Inspection>> GetByVehicleIdAsync(int vehicleId) =>
        await BaseQuery().Where(i => i.VehicleId == vehicleId)
                         .OrderByDescending(i => i.InspectedAt).ToListAsync();

    public async Task<Inspection?> GetByIdAsync(int id) =>
        await BaseQuery().FirstOrDefaultAsync(i => i.InspectionId == id);

    public async Task<Inspection?> GetLatestByVehicleIdAsync(int vehicleId) =>
        await BaseQuery().Where(i => i.VehicleId == vehicleId)
                         .OrderByDescending(i => i.InspectedAt)
                         .FirstOrDefaultAsync();

    public async Task<Inspection> CreateAsync(Inspection inspection)
    {
        inspection.CreatedAt = DateTime.UtcNow;
        _context.Inspections.Add(inspection);
        await _context.SaveChangesAsync();
        return (await BaseQuery().FirstAsync(i => i.InspectionId == inspection.InspectionId));
    }

    public async Task<Inspection?> UpdateAsync(int id, Inspection updated)
    {
        var inspection = await _context.Inspections.FindAsync(id);
        if (inspection == null) return null;

        if (updated.InspectedAt != default) inspection.InspectedAt = updated.InspectedAt;
        inspection.ValidTo = updated.ValidTo;
        if (!string.IsNullOrEmpty(updated.Result)) inspection.Result = updated.Result;
        inspection.Notes = updated.Notes;
        if (updated.OdometerKm.HasValue) inspection.OdometerKm = updated.OdometerKm;

        await _context.SaveChangesAsync();
        return await BaseQuery().FirstAsync(i => i.InspectionId == id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var inspection = await _context.Inspections.FindAsync(id);
        if (inspection == null) return false;
        _context.Inspections.Remove(inspection);
        await _context.SaveChangesAsync();
        return true;
    }
}
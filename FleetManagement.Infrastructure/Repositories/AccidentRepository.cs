using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Repositories;

public class AccidentRepository : IAccidentRepository
{
    private readonly FleetDbContext _context;
    public AccidentRepository(FleetDbContext context) => _context = context;

    private IQueryable<Accident> BaseQuery() =>
        _context.Accidents
            .Include(a => a.Vehicle)
            .Include(a => a.Driver).ThenInclude(d => d!.Employee);

    public async Task<IEnumerable<Accident>> GetAllAsync() =>
        await BaseQuery().OrderByDescending(a => a.OccurredAt).ToListAsync();

    public async Task<IEnumerable<Accident>> GetByVehicleIdAsync(int vehicleId) =>
        await BaseQuery().Where(a => a.VehicleId == vehicleId)
                         .OrderByDescending(a => a.OccurredAt).ToListAsync();

    public async Task<IEnumerable<Accident>> GetByDriverIdAsync(int driverId) =>
        await BaseQuery().Where(a => a.DriverId == driverId)
                         .OrderByDescending(a => a.OccurredAt).ToListAsync();

    public async Task<Accident?> GetByIdAsync(int id) =>
        await BaseQuery().FirstOrDefaultAsync(a => a.AccidentId == id);

    public async Task<Accident> CreateAsync(Accident accident)
    {
        accident.CreatedAt = DateTime.UtcNow;
        _context.Accidents.Add(accident);
        await _context.SaveChangesAsync();

        // Business rule #21: severity "total" → retire the vehicle
        if (accident.Severity == "total")
        {
            var vehicle = await _context.Vehicles.FindAsync(accident.VehicleId);
            if (vehicle != null && vehicle.Status == "active")
            {
                vehicle.Status = "retired";
                vehicle.ModifiedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        return (await BaseQuery().FirstAsync(a => a.AccidentId == accident.AccidentId));
    }

    public async Task<Accident?> UpdateAsync(int id, Accident updated)
    {
        var accident = await _context.Accidents.FindAsync(id);
        if (accident == null) return null;

        accident.DriverId = updated.DriverId;
        if (updated.OccurredAt != default) accident.OccurredAt = updated.OccurredAt;
        if (!string.IsNullOrEmpty(updated.Severity)) accident.Severity = updated.Severity;
        if (!string.IsNullOrEmpty(updated.Description)) accident.Description = updated.Description;
        accident.DamageEstimate = updated.DamageEstimate;
        accident.PoliceReport = updated.PoliceReport;
        accident.Notes = updated.Notes;
        accident.ModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await BaseQuery().FirstAsync(a => a.AccidentId == id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var accident = await _context.Accidents.FindAsync(id);
        if (accident == null) return false;
        _context.Accidents.Remove(accident);
        await _context.SaveChangesAsync();
        return true;
    }
}
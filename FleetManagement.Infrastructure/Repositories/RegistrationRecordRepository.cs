using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Repositories;

public class RegistrationRecordRepository : IRegistrationRecordRepository
{
    private readonly FleetDbContext _context;
    public RegistrationRecordRepository(FleetDbContext context) => _context = context;

    private IQueryable<RegistrationRecord> BaseQuery() =>
        _context.RegistrationRecords.Include(r => r.Vehicle);

    public async Task<IEnumerable<RegistrationRecord>> GetAllAsync() =>
        await BaseQuery().OrderByDescending(r => r.ValidTo).ToListAsync();

    public async Task<IEnumerable<RegistrationRecord>> GetByVehicleIdAsync(int vehicleId) =>
        await BaseQuery()
            .Where(r => r.VehicleId == vehicleId)
            .OrderByDescending(r => r.ValidTo)
            .ToListAsync();

    public async Task<RegistrationRecord?> GetByIdAsync(int id) =>
        await BaseQuery().FirstOrDefaultAsync(r => r.RegistrationId == id);

    public async Task<RegistrationRecord?> GetCurrentByVehicleIdAsync(int vehicleId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return await BaseQuery()
            .Where(r => r.VehicleId == vehicleId && r.ValidFrom <= today && r.ValidTo >= today)
            .OrderByDescending(r => r.ValidTo)
            .FirstOrDefaultAsync();
    }

    public async Task<RegistrationRecord> CreateAsync(RegistrationRecord record)
    {
        record.CreatedAt = DateTime.UtcNow;
        _context.RegistrationRecords.Add(record);
        await _context.SaveChangesAsync();
        return (await BaseQuery().FirstAsync(r => r.RegistrationId == record.RegistrationId));
    }

    public async Task<RegistrationRecord?> UpdateAsync(int id, RegistrationRecord updated)
    {
        var record = await _context.RegistrationRecords.FindAsync(id);
        if (record == null) return null;

        if (!string.IsNullOrEmpty(updated.RegistrationNumber))
            record.RegistrationNumber = updated.RegistrationNumber;
        if (updated.ValidFrom != default) record.ValidFrom = updated.ValidFrom;
        if (updated.ValidTo != default) record.ValidTo = updated.ValidTo;
        record.Fee = updated.Fee;
        record.Notes = updated.Notes;
        record.ModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await BaseQuery().FirstAsync(r => r.RegistrationId == id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var record = await _context.RegistrationRecords.FindAsync(id);
        if (record == null) return false;
        _context.RegistrationRecords.Remove(record);
        await _context.SaveChangesAsync();
        return true;
    }
}
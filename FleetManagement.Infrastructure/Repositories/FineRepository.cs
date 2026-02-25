using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Repositories;

public class FineRepository : IFineRepository
{
    private readonly FleetDbContext _context;
    public FineRepository(FleetDbContext context) => _context = context;

    private IQueryable<Fine> BaseQuery() =>
        _context.Fines
            .Include(f => f.Vehicle)
            .Include(f => f.Driver).ThenInclude(d => d!.Employee);

    public async Task<IEnumerable<Fine>> GetAllAsync() =>
        await BaseQuery().OrderByDescending(f => f.OccurredAt).ToListAsync();

    public async Task<IEnumerable<Fine>> GetByVehicleIdAsync(int vehicleId) =>
        await BaseQuery()
            .Where(f => f.VehicleId == vehicleId)
            .OrderByDescending(f => f.OccurredAt)
            .ToListAsync();

    public async Task<IEnumerable<Fine>> GetByDriverIdAsync(int driverId) =>
        await BaseQuery()
            .Where(f => f.DriverId == driverId)
            .OrderByDescending(f => f.OccurredAt)
            .ToListAsync();

    public async Task<IEnumerable<Fine>> GetUnpaidAsync() =>
        await BaseQuery()
            .Where(f => f.PaidAt == null)
            .OrderBy(f => f.OccurredAt)
            .ToListAsync();

    public async Task<Fine?> GetByIdAsync(int id) =>
        await BaseQuery().FirstOrDefaultAsync(f => f.FineId == id);

    public async Task<Fine> CreateAsync(Fine fine)
    {
        fine.CreatedAt = DateTime.UtcNow;
        _context.Fines.Add(fine);
        await _context.SaveChangesAsync();
        return (await BaseQuery().FirstAsync(f => f.FineId == fine.FineId));
    }

    public async Task<Fine?> UpdateAsync(int id, Fine updated)
    {
        var fine = await _context.Fines.FindAsync(id);
        if (fine == null) return null;

        fine.DriverId = updated.DriverId;
        if (updated.OccurredAt != default) fine.OccurredAt = updated.OccurredAt;
        if (updated.Amount != default) fine.Amount = updated.Amount;
        if (!string.IsNullOrEmpty(updated.Reason)) fine.Reason = updated.Reason;
        fine.Notes = updated.Notes;
        fine.ModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await BaseQuery().FirstAsync(f => f.FineId == id);
    }

    public async Task<Fine?> MarkPaidAsync(int id, DateTime paidAt, string? paymentMethod)
    {
        var fine = await _context.Fines.FindAsync(id);
        if (fine == null) return null;

        fine.PaidAt = paidAt;
        fine.PaymentMethod = paymentMethod;
        fine.ModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await BaseQuery().FirstAsync(f => f.FineId == id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var fine = await _context.Fines.FindAsync(id);
        if (fine == null) return false;
        _context.Fines.Remove(fine);
        await _context.SaveChangesAsync();
        return true;
    }
}
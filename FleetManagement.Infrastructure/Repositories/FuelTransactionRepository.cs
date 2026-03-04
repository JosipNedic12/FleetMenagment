using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Repositories;

public class FuelTransactionRepository : IFuelTransactionRepository
{
    private readonly FleetDbContext _context;
    public FuelTransactionRepository(FleetDbContext context) => _context = context;

    private IQueryable<FuelTransaction> BaseQuery() =>
        _context.FuelTransactions
            .Include(t => t.Vehicle)
            .Include(t => t.FuelCard)
            .Include(t => t.FuelType);

    public async Task<IEnumerable<FuelTransaction>> GetAllAsync() =>
        await BaseQuery()
            .OrderByDescending(t => t.PostedAt)
            .ToListAsync();

    public async Task<IEnumerable<FuelTransaction>> GetByVehicleIdAsync(int vehicleId) =>
        await BaseQuery()
            .Where(t => t.VehicleId == vehicleId)
            .OrderByDescending(t => t.PostedAt)
            .ToListAsync();

    public async Task<FuelTransaction?> GetByIdAsync(int id) =>
        await BaseQuery().FirstOrDefaultAsync(t => t.TransactionId == id);

    public async Task<FuelTransaction> CreateAsync(FuelTransaction transaction)
    {
        transaction.CreatedAt = DateTime.UtcNow;
        transaction.PostedAt = DateTime.SpecifyKind(transaction.PostedAt, DateTimeKind.Utc);
        _context.FuelTransactions.Add(transaction);

        // Auto-update vehicle odometer if provided and higher than current
        if (transaction.OdometerKm.HasValue)
        {
            var vehicle = await _context.Vehicles.FindAsync(transaction.VehicleId);
            if (vehicle != null && transaction.OdometerKm.Value > vehicle.CurrentOdometerKm)
            {
                vehicle.CurrentOdometerKm = transaction.OdometerKm.Value;
                vehicle.ModifiedAt = DateTime.UtcNow;

                // Also log to odometer_log
                _context.OdometerLogs.Add(new OdometerLog
                {
                    VehicleId = transaction.VehicleId,
                    OdometerKm = transaction.OdometerKm.Value,
                    LogDate = DateOnly.FromDateTime(transaction.PostedAt),
                    Notes = $"Auto-logged from fuel transaction #{transaction.TransactionId}",
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync();
        return await _context.FuelTransactions
        .Include(t => t.Vehicle)
        .Include(t => t.FuelType)
        .Include(t => t.FuelCard)
        .FirstAsync(t => t.TransactionId == transaction.TransactionId);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var transaction = await _context.FuelTransactions.FindAsync(id);
        if (transaction == null) return false;

        _context.FuelTransactions.Remove(transaction);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> MarkSuspiciousAsync(int id, bool isSuspicious)
    {
        var transaction = await _context.FuelTransactions.FindAsync(id);
        if (transaction == null) return false;

        transaction.IsSuspicious = isSuspicious;
        await _context.SaveChangesAsync();
        return true;
    }
}
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Repositories;
public class FuelCardRepository : IFuelCardRepository
{
    private readonly FleetDbContext _context;
    public FuelCardRepository(FleetDbContext context) => _context = context;

    public async Task<IEnumerable<FuelCard>> GetAllAsync() =>
        await _context.FuelCards
            .Include(c => c.AssignedVehicle)
            .OrderBy(c => c.CardNumber)
            .ToListAsync();

    public async Task<FuelCard?> GetByIdAsync(int id) =>
        await _context.FuelCards
            .Include(c => c.AssignedVehicle)
            .FirstOrDefaultAsync(c => c.FuelCardId == id);

    public async Task<IEnumerable<FuelCard>> GetByVehicleIdAsync(int vehicleId) =>
        await _context.FuelCards
            .Include(c => c.AssignedVehicle)
            .Where(c => c.AssignedVehicleId == vehicleId)
            .ToListAsync();

    public async Task<FuelCard> CreateAsync(FuelCard card)
    {
        card.CreatedAt = DateTime.UtcNow;
        _context.FuelCards.Add(card);
        await _context.SaveChangesAsync();
        return await _context.FuelCards
            .Include(c => c.AssignedVehicle)
            .FirstAsync(c => c.FuelCardId == card.FuelCardId);
    }

    public async Task<FuelCard?> UpdateAsync(int id, FuelCard updated)
    {
        var card = await _context.FuelCards.FindAsync(id);
        if (card == null) return null;

        card.Provider = updated.Provider;
        card.AssignedVehicleId = updated.AssignedVehicleId;
        card.ValidFrom = updated.ValidFrom;
        card.ValidTo = updated.ValidTo;
        card.IsActive = updated.IsActive;
        card.Notes = updated.Notes;
        card.ModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await _context.FuelCards
            .Include(c => c.AssignedVehicle)
            .FirstAsync(c => c.FuelCardId == id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var card = await _context.FuelCards.FindAsync(id);
        if (card == null) return false;

        card.IsActive = false;
        card.ModifiedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }
}
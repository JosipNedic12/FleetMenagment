using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Repositories;

public class VehicleRepository : IVehicleRepository
{
    private readonly FleetDbContext _context;

    public VehicleRepository(FleetDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Vehicle>> GetAllAsync()
    {
        return await _context.Vehicles
            .Include(v => v.Make)
            .Include(v => v.Model)
            .Include(v => v.Category)
            .Include(v => v.FuelType)
            .Where(v => !v.IsDeleted)
            .OrderBy(v => v.RegistrationNumber)
            .ToListAsync();
    }

    public async Task<Vehicle?> GetByIdAsync(int id)
    {
        return await _context.Vehicles
            .Include(v => v.Make)
            .Include(v => v.Model)
            .Include(v => v.Category)
            .Include(v => v.FuelType)
            .FirstOrDefaultAsync(v => v.VehicleId == id && !v.IsDeleted);
    }

    public async Task<Vehicle> CreateAsync(Vehicle vehicle)
    {
        vehicle.CreatedAt = DateTime.UtcNow;
        _context.Vehicles.Add(vehicle);
        await _context.SaveChangesAsync();
        return vehicle;
    }

    public async Task<Vehicle?> UpdateAsync(int id, Vehicle updated)
    {
        var vehicle = await _context.Vehicles.FindAsync(id);
        if (vehicle == null || vehicle.IsDeleted) return null;

        vehicle.Color = updated.Color;
        vehicle.Status = updated.Status;
        vehicle.Notes = updated.Notes;
        vehicle.ModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return vehicle;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var vehicle = await _context.Vehicles.FindAsync(id);
        if (vehicle == null || vehicle.IsDeleted) return false;

        vehicle.IsDeleted = true;
        vehicle.ModifiedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsAsync(string registrationNumber, string vin)
    {
        return await _context.Vehicles
            .AnyAsync(v => !v.IsDeleted &&
                (v.RegistrationNumber == registrationNumber || v.Vin == vin));
    }
}
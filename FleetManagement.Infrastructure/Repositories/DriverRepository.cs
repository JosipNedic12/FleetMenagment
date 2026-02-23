using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Repositories;

public class DriverRepository : IDriverRepository
{
    private readonly FleetDbContext _context;
    public DriverRepository(FleetDbContext context) => _context = context;

    public async Task<IEnumerable<Driver>> GetAllAsync() =>
        await _context.Drivers
            .Include(d => d.Employee)
            .Include(d => d.LicenseCategories)
                .ThenInclude(lc => lc.LicenseCategory)
            .Where(d => !d.IsDeleted)
            .ToListAsync();

    public async Task<Driver?> GetByIdAsync(int id) =>
        await _context.Drivers
            .Include(d => d.Employee)
            .Include(d => d.LicenseCategories)
                .ThenInclude(lc => lc.LicenseCategory)
            .FirstOrDefaultAsync(d => d.DriverId == id && !d.IsDeleted);

    public async Task<Driver> CreateAsync(Driver driver, List<int> licenseCategoryIds)
    {
        driver.CreatedAt = DateTime.UtcNow;
        _context.Drivers.Add(driver);
        await _context.SaveChangesAsync();

        foreach (var categoryId in licenseCategoryIds)
        {
            _context.DriverLicenseCategories.Add(new DriverLicenseCategory
            {
                DriverId = driver.DriverId,
                LicenseCategoryId = categoryId
            });
        }
        await _context.SaveChangesAsync();

        // Fetch the full driver with all navigation properties loaded
        return await _context.Drivers
            .Include(d => d.Employee)
            .Include(d => d.LicenseCategories)
                .ThenInclude(lc => lc.LicenseCategory)
            .FirstAsync(d => d.DriverId == driver.DriverId);
    }

    public async Task<Driver?> UpdateAsync(int id, Driver updated, List<int>? licenseCategoryIds)
    {
        var driver = await _context.Drivers
            .Include(d => d.LicenseCategories)
            .FirstOrDefaultAsync(d => d.DriverId == id && !d.IsDeleted);

        if (driver == null) return null;

        if (updated.LicenseNumber != null) driver.LicenseNumber = updated.LicenseNumber;
        if (updated.LicenseExpiry != default) driver.LicenseExpiry = updated.LicenseExpiry;
        if (updated.Notes != null) driver.Notes = updated.Notes;
        driver.ModifiedAt = DateTime.UtcNow;

        // Replace license categories if provided
        if (licenseCategoryIds != null)
        {
            _context.DriverLicenseCategories.RemoveRange(driver.LicenseCategories);
            foreach (var categoryId in licenseCategoryIds)
            {
                _context.DriverLicenseCategories.Add(new DriverLicenseCategory
                {
                    DriverId = driver.DriverId,
                    LicenseCategoryId = categoryId
                });
            }
        }

        await _context.SaveChangesAsync();
        return await _context.Drivers
            .Include(d => d.Employee)
            .Include(d => d.LicenseCategories)
                .ThenInclude(lc => lc.LicenseCategory)
            .FirstAsync(d => d.DriverId == id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var driver = await _context.Drivers.FindAsync(id);
        if (driver == null || driver.IsDeleted) return false;

        driver.IsDeleted = true;
        driver.ModifiedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> LicenseNumberExistsAsync(string licenseNumber) =>
        await _context.Drivers.AnyAsync(d => !d.IsDeleted && d.LicenseNumber == licenseNumber);
}
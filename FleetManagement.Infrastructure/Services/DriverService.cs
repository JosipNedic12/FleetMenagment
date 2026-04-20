using System.Linq.Expressions;
using FleetManagement.Application.Common;
using FleetManagement.Application.Common.Filters;
using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Services;

public class DriverService
{
    private readonly FleetDbContext _db;

    public DriverService(FleetDbContext db)
    {
        _db = db;
    }

    private IQueryable<Driver> BaseQuery() =>
        _db.Drivers
            .Include(d => d.Employee)
            .Include(d => d.LicenseCategories)
                .ThenInclude(lc => lc.LicenseCategory)
            .Where(d => !d.IsDeleted);

    private static readonly Dictionary<string, Expression<Func<Driver, object>>> AllowedSorts = new(StringComparer.OrdinalIgnoreCase)
    {
        ["fullName"]      = d => d.Employee.LastName,
        ["department"]    = d => d.Employee.Department!,
        ["licenseNumber"] = d => d.LicenseNumber,
        ["licenseExpiry"] = d => d.LicenseExpiry
    };

    public async Task<PagedResponse<DriverDto>> GetPagedAsync(PagedRequest<DriverFilter> request)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(d =>
                (d.Employee.FirstName + " " + d.Employee.LastName).ToLower().Contains(term) ||
                d.LicenseNumber.ToLower().Contains(term));
        }

        var f = request.Filter;
        var today = DateOnly.FromDateTime(DateTime.Today);

        if (!string.IsNullOrWhiteSpace(f.LicenseStatus))
        {
            query = f.LicenseStatus switch
            {
                "valid"          => query.Where(d => d.LicenseExpiry >= today),
                "expired"        => query.Where(d => d.LicenseExpiry < today),
                "expiring_soon"  => query.Where(d => d.LicenseExpiry >= today && d.LicenseExpiry <= today.AddDays(30)),
                _                => query
            };
        }

        if (!string.IsNullOrWhiteSpace(f.Department))
            query = query.Where(d => d.Employee.Department == f.Department);

        var totalCount = await query.CountAsync();

        var entities = await query
            .ApplySort(request.SortBy, request.IsDescending, AllowedSorts, d => d.Employee.LastName)
            .ApplyPaging(request.Skip, request.PageSize)
            .ToListAsync();

        var items = entities.Select(MapToDto).ToList();

        return PagedResponse<DriverDto>.Create(items, totalCount, request.Page, request.PageSize);
    }

    public async Task<IEnumerable<DriverDto>> GetAllAsync()
    {
        return await BaseQuery()
            .OrderBy(d => d.Employee.LastName)
            .Select(d => MapToDto(d))
            .ToListAsync();
    }

    public async Task<DriverDto?> GetByIdAsync(int id)
    {
        var driver = await BaseQuery().FirstOrDefaultAsync(d => d.DriverId == id);
        if (driver == null) throw new NotFoundException($"Driver with id {id} was not found.");
        return MapToDto(driver);
    }

    public async Task<DriverDto> CreateAsync(CreateDriverDto dto)
    {
        var exists = await _db.Drivers.AnyAsync(d => !d.IsDeleted && d.LicenseNumber == dto.LicenseNumber);
        if (exists) throw new ConflictException("A driver with this license number already exists.");

        var driver = new Driver
        {
            EmployeeId = dto.EmployeeId,
            LicenseNumber = dto.LicenseNumber.Trim(),
            LicenseExpiry = dto.LicenseExpiry,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _db.Drivers.Add(driver);
        await _db.SaveChangesAsync();

        foreach (var categoryId in dto.LicenseCategoryIds)
        {
            _db.DriverLicenseCategories.Add(new DriverLicenseCategory
            {
                DriverId = driver.DriverId,
                LicenseCategoryId = categoryId
            });
        }
        await _db.SaveChangesAsync();

        return MapToDto(await BaseQuery().FirstAsync(d => d.DriverId == driver.DriverId));
    }

    public async Task<DriverDto?> UpdateAsync(int id, UpdateDriverDto dto)
    {
        var driver = await _db.Drivers
            .Include(d => d.LicenseCategories)
            .FirstOrDefaultAsync(d => d.DriverId == id && !d.IsDeleted);

        if (driver == null) throw new NotFoundException($"Driver with id {id} was not found.");

        if (dto.LicenseNumber != null) driver.LicenseNumber = dto.LicenseNumber;
        if (dto.LicenseExpiry.HasValue && dto.LicenseExpiry != default) driver.LicenseExpiry = dto.LicenseExpiry.Value;
        if (dto.Notes != null) driver.Notes = dto.Notes;
        driver.ModifiedAt = DateTime.UtcNow;

        if (dto.LicenseCategoryIds != null)
        {
            _db.DriverLicenseCategories.RemoveRange(driver.LicenseCategories);
            foreach (var categoryId in dto.LicenseCategoryIds)
            {
                _db.DriverLicenseCategories.Add(new DriverLicenseCategory
                {
                    DriverId = driver.DriverId,
                    LicenseCategoryId = categoryId
                });
            }
        }

        await _db.SaveChangesAsync();
        return MapToDto(await BaseQuery().FirstAsync(d => d.DriverId == id));
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var driver = await _db.Drivers.FindAsync(id);
        if (driver == null || driver.IsDeleted) throw new NotFoundException($"Driver with id {id} was not found.");

        driver.IsDeleted = true;
        driver.ModifiedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public IQueryable<Driver> GetFilteredQueryable(DriverFilter filter, string? search)
    {
        var query = BaseQuery();
        var today = DateOnly.FromDateTime(DateTime.Today);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(d =>
                (d.Employee.FirstName + " " + d.Employee.LastName).ToLower().Contains(term) ||
                d.LicenseNumber.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(filter.LicenseStatus))
        {
            query = filter.LicenseStatus switch
            {
                "valid"         => query.Where(d => d.LicenseExpiry >= today),
                "expired"       => query.Where(d => d.LicenseExpiry < today),
                "expiring_soon" => query.Where(d => d.LicenseExpiry >= today && d.LicenseExpiry <= today.AddDays(30)),
                _               => query
            };
        }

        if (!string.IsNullOrWhiteSpace(filter.Department))
            query = query.Where(d => d.Employee.Department == filter.Department);

        return query;
    }

    public async Task<List<DriverDto>> GetFilteredDtosAsync(DriverFilter filter, string? search)
    {
        var entities = await GetFilteredQueryable(filter, search).ToListAsync();
        return entities.Select(MapToDto).ToList();
    }

    public static List<ExportColumn<DriverDto>> GetExportColumns(string lang = "hr") => new()
    {
        new() { Header = lang == "hr" ? "Ime i prezime"       : "Full Name",          Width = 22, ValueSelector = d => d.FullName },
        new() { Header = lang == "hr" ? "Odjel"               : "Department",         Width = 16, ValueSelector = d => d.Department ?? "" },
        new() { Header = lang == "hr" ? "Broj vozačke"        : "License Number",     Width = 18, ValueSelector = d => d.LicenseNumber },
        new() { Header = lang == "hr" ? "Istek vozačke"       : "License Expiry",     Width = 14, ValueSelector = d => d.LicenseExpiry },
        new() { Header = lang == "hr" ? "Kategorije vozačke"  : "License Categories", Width = 20, ValueSelector = d => string.Join(", ", d.LicenseCategories) },
    };

    private static DriverDto MapToDto(Driver d) => new()
    {
        DriverId = d.DriverId,
        EmployeeId = d.EmployeeId,
        FullName = $"{d.Employee.FirstName} {d.Employee.LastName}",
        Department = d.Employee.Department,
        LicenseNumber = d.LicenseNumber,
        LicenseExpiry = d.LicenseExpiry,
        LicenseCategories = d.LicenseCategories
                             .Select(lc => lc.LicenseCategory.Code)
                             .ToList(),
        Notes = d.Notes
    };
}

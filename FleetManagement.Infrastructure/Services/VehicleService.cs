using System.Linq.Expressions;
using System.Text.RegularExpressions;
using FleetManagement.Application.Common;
using FleetManagement.Application.Common.Filters;
using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using static FleetManagement.Application.Exceptions.ErrorMessageKeys;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FleetManagement.Infrastructure.Services;

public class VehicleService
{
    private readonly FleetDbContext _db;
    private readonly ILogger<VehicleService> _logger;

    public VehicleService(FleetDbContext db, ILogger<VehicleService> logger)
    {
        _db = db;
        _logger = logger;
    }

    // ── Base query with all includes (replaces VehicleRepository.BaseQuery) ──
    private IQueryable<Vehicle> BaseQuery() =>
        _db.Vehicles
            .Include(v => v.Make)
            .Include(v => v.Model)
            .Include(v => v.Category)
            .Include(v => v.FuelType)
            .Where(v => !v.IsDeleted);

    // ── Allowed sort columns (prevents arbitrary SQL injection via sortBy) ──
    private static readonly Dictionary<string, Expression<Func<Vehicle, object>>> AllowedSorts = new(StringComparer.OrdinalIgnoreCase)
    {
        ["registrationNumber"] = v => v.RegistrationNumber,
        ["make"]               = v => v.Make.Name,
        ["model"]              = v => v.Model.Name,
        ["year"]               = v => v.Year,
        ["status"]             = v => v.Status,
        ["currentOdometerKm"]  = v => v.CurrentOdometerKm,
        ["category"]           = v => v.Category.Name,
        ["fuelType"]           = v => v.FuelType.Label
    };

    // ── NEW: Server-side filtered + paginated list ──
    public async Task<PagedResponse<VehicleDto>> GetPagedAsync(PagedRequest<VehicleFilter> request)
    {
        var query = BaseQuery();

        // -- Global text search --
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = Regex.Replace(request.Search.Trim().ToLower(), @"\s+", " ");
            query = query.Where(v =>
                (v.Make.Name + " " + v.Model.Name + " " + v.RegistrationNumber).ToLower().Contains(term) ||
                v.Vin.ToLower().Contains(term));
        }

        // -- Entity-specific filters --
        var f = request.Filter;

        if (!string.IsNullOrWhiteSpace(f.Status))
            query = query.Where(v => v.Status == f.Status);

        if (f.MakeId.HasValue)
            query = query.Where(v => v.MakeId == f.MakeId.Value);

        if (f.CategoryId.HasValue)
            query = query.Where(v => v.CategoryId == f.CategoryId.Value);

        if (f.FuelTypeId.HasValue)
            query = query.Where(v => v.FuelTypeId == f.FuelTypeId.Value);

        if (f.YearFrom.HasValue)
            query = query.Where(v => v.Year >= f.YearFrom.Value);

        if (f.YearTo.HasValue)
            query = query.Where(v => v.Year <= f.YearTo.Value);

        // -- Count before paging --
        var totalCount = await query.CountAsync();

        // -- Sort + Page (materialize first, then map) --
        var entities = await query
            .ApplySort(request.SortBy, request.IsDescending, AllowedSorts, v => v.RegistrationNumber)
            .ApplyPaging(request.Skip, request.PageSize)
            .ToListAsync();

        var items = entities.Select(MapToDto).ToList();

        return PagedResponse<VehicleDto>.Create(items, totalCount, request.Page, request.PageSize);
    }

    // ── Keep GetAllAsync for backward compat (dropdowns, detail pages) ──
    public async Task<IEnumerable<VehicleDto>> GetAllAsync()
    {
        return await BaseQuery()
            .OrderBy(v => v.RegistrationNumber)
            .Select(v => MapToDto(v))
            .ToListAsync();
    }

    public async Task<VehicleDto?> GetByIdAsync(int id)
    {
        var vehicle = await BaseQuery()
            .FirstOrDefaultAsync(v => v.VehicleId == id);

        if (vehicle == null)
            throw new NotFoundException(VehicleNotFound);

        return MapToDto(vehicle);
    }

    public async Task<VehicleDto> CreateAsync(CreateVehicleDto dto)
    {
        var regNorm = dto.RegistrationNumber.ToUpper().Trim();
        var vinNorm = dto.Vin.ToUpper().Trim();

        var exists = await _db.Vehicles.AnyAsync(v =>
            !v.IsDeleted &&
            (v.RegistrationNumber == regNorm || v.Vin == vinNorm));

        if (exists)
        {
            _logger.LogWarning("Duplicate vehicle: Reg={Reg} VIN={Vin}", regNorm, vinNorm);
            throw new ConflictException(VehicleDuplicate);
        }

        var vehicle = new Vehicle
        {
            RegistrationNumber = dto.RegistrationNumber.ToUpper().Trim(),
            Vin = dto.Vin.ToUpper().Trim(),
            MakeId = dto.MakeId,
            ModelId = dto.ModelId,
            CategoryId = dto.CategoryId,
            FuelTypeId = dto.FuelTypeId,
            Year = dto.Year,
            Color = dto.Color,
            Notes = dto.Notes,
            Status = "active",
            CreatedAt = DateTime.UtcNow
        };

        _db.Vehicles.Add(vehicle);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Vehicle {Reg} created (Id: {Id})", vehicle.RegistrationNumber, vehicle.VehicleId);

        // Reload with includes
        return MapToDto(await BaseQuery().FirstAsync(v => v.VehicleId == vehicle.VehicleId));
    }

    public async Task<VehicleDto?> UpdateAsync(int id, UpdateVehicleDto dto)
    {
        var vehicle = await _db.Vehicles.FindAsync(id);
        if (vehicle == null || vehicle.IsDeleted)
            throw new NotFoundException(VehicleNotFound);

        vehicle.Color = dto.Color;
        vehicle.Status = dto.Status ?? vehicle.Status;
        vehicle.Notes = dto.Notes;
        vehicle.ModifiedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Vehicle {Id} updated", id);

        // Reload with includes for DTO mapping
        return MapToDto(await BaseQuery().FirstAsync(v => v.VehicleId == id));
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var vehicle = await _db.Vehicles.FindAsync(id);
        if (vehicle == null || vehicle.IsDeleted)
            throw new NotFoundException(VehicleNotFound);

        vehicle.IsDeleted = true;
        vehicle.ModifiedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    // ── Expose filtered IQueryable for export (Phase 5 will use this) ──
    public IQueryable<Vehicle> GetFilteredQueryable(VehicleFilter filter, string? search)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = Regex.Replace(search.Trim().ToLower(), @"\s+", " ");
            query = query.Where(v =>
                (v.Make.Name + " " + v.Model.Name + " " + v.RegistrationNumber).ToLower().Contains(term) ||
                v.Vin.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
            query = query.Where(v => v.Status == filter.Status);
        if (filter.MakeId.HasValue)
            query = query.Where(v => v.MakeId == filter.MakeId.Value);
        if (filter.CategoryId.HasValue)
            query = query.Where(v => v.CategoryId == filter.CategoryId.Value);
        if (filter.FuelTypeId.HasValue)
            query = query.Where(v => v.FuelTypeId == filter.FuelTypeId.Value);
        if (filter.YearFrom.HasValue)
            query = query.Where(v => v.Year >= filter.YearFrom.Value);
        if (filter.YearTo.HasValue)
            query = query.Where(v => v.Year <= filter.YearTo.Value);

        return query;
    }

    public async Task<List<VehicleDto>> GetFilteredDtosAsync(VehicleFilter filter, string? search)
    {
        var entities = await GetFilteredQueryable(filter, search).ToListAsync();
        return entities.Select(MapToDto).ToList();
    }

    // ── Export column definitions (Phase 5 will use this) ──
    public static List<ExportColumn<VehicleDto>> GetExportColumns(string lang = "hr") => new()
    {
        new() { Header = lang == "hr" ? "Reg. oznaka"   : "Reg. Number",   Width = 18, ValueSelector = v => v.RegistrationNumber },
        new() { Header = "VIN",                                             Width = 22, ValueSelector = v => v.Vin },
        new() { Header = lang == "hr" ? "Marka"         : "Make",          Width = 15, ValueSelector = v => v.Make },
        new() { Header = lang == "hr" ? "Model"         : "Model",         Width = 15, ValueSelector = v => v.Model },
        new() { Header = lang == "hr" ? "Kategorija"    : "Category",      Width = 14, ValueSelector = v => v.Category },
        new() { Header = lang == "hr" ? "Vrsta goriva"  : "Fuel Type",     Width = 12, ValueSelector = v => v.FuelType },
        new() { Header = lang == "hr" ? "Godina"        : "Year",          Width = 8,  ValueSelector = v => v.Year },
        new() { Header = lang == "hr" ? "Boja"          : "Color",         Width = 10, ValueSelector = v => v.Color ?? "" },
        new() { Header = lang == "hr" ? "Status"        : "Status",        Width = 10, ValueSelector = v => v.Status },
        new() { Header = lang == "hr" ? "Kilometraža"   : "Odometer (km)", Width = 14, ValueSelector = v => v.CurrentOdometerKm },
    };

    // ── DTO mapping ──
    private static VehicleDto MapToDto(Vehicle v) => new()
    {
        VehicleId = v.VehicleId,
        RegistrationNumber = v.RegistrationNumber,
        Vin = v.Vin,
        Make = v.Make?.Name ?? string.Empty,
        Model = v.Model?.Name ?? string.Empty,
        Category = v.Category?.Name ?? string.Empty,
        FuelType = v.FuelType?.Label ?? string.Empty,
        Year = v.Year,
        Color = v.Color,
        Status = v.Status,
        CurrentOdometerKm = v.CurrentOdometerKm,
        Notes = v.Notes
    };
}

using System.Linq.Expressions;
using FleetManagement.Application.Common;
using FleetManagement.Application.Common.Filters;
using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Services;

public class AccidentService
{
    private readonly FleetDbContext _db;

    public AccidentService(FleetDbContext db)
    {
        _db = db;
    }

    private IQueryable<Accident> BaseQuery() =>
        _db.Accidents
            .Include(a => a.Vehicle).ThenInclude(v => v.Make)
            .Include(a => a.Vehicle).ThenInclude(v => v.Model)
            .Include(a => a.Driver).ThenInclude(d => d!.Employee);

    private static readonly Dictionary<string, Expression<Func<Accident, object>>> AllowedSorts = new(StringComparer.OrdinalIgnoreCase)
    {
        ["vehicle"]        = a => a.Vehicle.RegistrationNumber,
        ["driver"]         = a => a.Driver!.Employee.LastName,
        ["occurredAt"]     = a => a.OccurredAt,
        ["severity"]       = a => a.Severity,
        ["damageEstimate"] = a => a.DamageEstimate!
    };

    public async Task<PagedResponse<AccidentDto>> GetPagedAsync(PagedRequest<AccidentFilter> request)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(a =>
                a.Vehicle.RegistrationNumber.ToLower().Contains(term) ||
                a.Description.ToLower().Contains(term) ||
                (a.Driver != null && (
                    a.Driver.Employee.FirstName.ToLower().Contains(term) ||
                    a.Driver.Employee.LastName.ToLower().Contains(term))));
        }

        var f = request.Filter;

        if (!string.IsNullOrWhiteSpace(f.Severity))
            query = query.Where(a => a.Severity == f.Severity);

        if (f.VehicleId.HasValue)
            query = query.Where(a => a.VehicleId == f.VehicleId.Value);

        if (f.DriverId.HasValue)
            query = query.Where(a => a.DriverId == f.DriverId.Value);

        if (f.DateFrom.HasValue)
            query = query.Where(a => DateOnly.FromDateTime(a.OccurredAt) >= f.DateFrom.Value);

        if (f.DateTo.HasValue)
            query = query.Where(a => DateOnly.FromDateTime(a.OccurredAt) <= f.DateTo.Value);

        var totalCount = await query.CountAsync();

        var entities = await query
            .ApplySort(request.SortBy, request.IsDescending, AllowedSorts, a => a.OccurredAt)
            .ApplyPaging(request.Skip, request.PageSize)
            .ToListAsync();

        return PagedResponse<AccidentDto>.Create(entities.Select(MapToDto).ToList(), totalCount, request.Page, request.PageSize);
    }

    public async Task<IEnumerable<AccidentDto>> GetAllAsync()
    {
        return await BaseQuery()
            .OrderByDescending(a => a.OccurredAt)
            .Select(a => MapToDto(a))
            .ToListAsync();
    }

    public async Task<AccidentDto?> GetByIdAsync(int id)
    {
        var accident = await BaseQuery().FirstOrDefaultAsync(a => a.AccidentId == id);
        if (accident == null)
            throw new NotFoundException($"Accident with id {id} was not found.");
        return MapToDto(accident);
    }

    public async Task<IEnumerable<AccidentDto>> GetByVehicleIdAsync(int vehicleId)
    {
        return await BaseQuery()
            .Where(a => a.VehicleId == vehicleId)
            .OrderByDescending(a => a.OccurredAt)
            .Select(a => MapToDto(a))
            .ToListAsync();
    }

    public async Task<IEnumerable<AccidentDto>> GetByDriverIdAsync(int driverId)
    {
        return await BaseQuery()
            .Where(a => a.DriverId == driverId)
            .OrderByDescending(a => a.OccurredAt)
            .Select(a => MapToDto(a))
            .ToListAsync();
    }

    private static readonly string[] ValidSeverities = ["minor", "major", "total"];

    public async Task<AccidentDto> CreateAsync(CreateAccidentDto dto)
    {
        if (!ValidSeverities.Contains(dto.Severity))
            throw new ArgumentException("severity must be: minor | major | total");

        var accident = new Accident
        {
            VehicleId = dto.VehicleId,
            DriverId = dto.DriverId,
            OccurredAt = dto.OccurredAt,
            Severity = dto.Severity,
            Description = dto.Description,
            DamageEstimate = dto.DamageEstimate,
            PoliceReport = dto.PoliceReport,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _db.Accidents.Add(accident);
        await _db.SaveChangesAsync();

        // Business rule: total-loss accident retires the vehicle
        if (accident.Severity == "total")
        {
            var vehicle = await _db.Vehicles.FindAsync(accident.VehicleId);
            if (vehicle != null && vehicle.Status == "active")
            {
                vehicle.Status = "retired";
                vehicle.ModifiedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
        }

        return MapToDto(await BaseQuery().FirstAsync(a => a.AccidentId == accident.AccidentId));
    }

    public async Task<AccidentDto?> UpdateAsync(int id, UpdateAccidentDto dto)
    {
        var accident = await _db.Accidents.FindAsync(id);
        if (accident == null)
            throw new NotFoundException($"Accident with id {id} was not found.");

        if (dto.DriverId.HasValue) accident.DriverId = dto.DriverId.Value;
        if (dto.OccurredAt.HasValue) accident.OccurredAt = dto.OccurredAt.Value;
        if (dto.Severity != null)
        {
            if (!ValidSeverities.Contains(dto.Severity))
                throw new ArgumentException("severity must be: minor | major | total");
            accident.Severity = dto.Severity;
        }
        if (dto.Description != null) accident.Description = dto.Description;
        if (dto.DamageEstimate.HasValue) accident.DamageEstimate = dto.DamageEstimate.Value;
        if (dto.PoliceReport != null) accident.PoliceReport = dto.PoliceReport;
        if (dto.Notes != null) accident.Notes = dto.Notes;
        accident.ModifiedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return MapToDto(await BaseQuery().FirstAsync(a => a.AccidentId == id));
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var accident = await _db.Accidents.FindAsync(id);
        if (accident == null)
            throw new NotFoundException($"Accident with id {id} was not found.");

        _db.Accidents.Remove(accident);
        await _db.SaveChangesAsync();
        return true;
    }

    public IQueryable<Accident> GetFilteredQueryable(AccidentFilter filter, string? search)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(a =>
                a.Vehicle.RegistrationNumber.ToLower().Contains(term) ||
                a.Description.ToLower().Contains(term) ||
                (a.Driver != null && (
                    a.Driver.Employee.FirstName.ToLower().Contains(term) ||
                    a.Driver.Employee.LastName.ToLower().Contains(term))));
        }

        if (!string.IsNullOrWhiteSpace(filter.Severity))
            query = query.Where(a => a.Severity == filter.Severity);

        if (filter.VehicleId.HasValue)
            query = query.Where(a => a.VehicleId == filter.VehicleId.Value);

        if (filter.DriverId.HasValue)
            query = query.Where(a => a.DriverId == filter.DriverId.Value);

        if (filter.DateFrom.HasValue)
            query = query.Where(a => DateOnly.FromDateTime(a.OccurredAt) >= filter.DateFrom.Value);

        if (filter.DateTo.HasValue)
            query = query.Where(a => DateOnly.FromDateTime(a.OccurredAt) <= filter.DateTo.Value);

        return query;
    }

    public async Task<List<AccidentDto>> GetFilteredDtosAsync(AccidentFilter filter, string? search)
    {
        var entities = await GetFilteredQueryable(filter, search).ToListAsync();
        return entities.Select(MapToDto).ToList();
    }

    public static List<ExportColumn<AccidentDto>> GetExportColumns(string lang = "hr") => new()
    {
        new() { Header = lang == "hr" ? "Vozilo"          : "Vehicle",       Width = 16, ValueSelector = a => a.RegistrationNumber },
        new() { Header = lang == "hr" ? "Vozač"           : "Driver",        Width = 22, ValueSelector = a => a.DriverName ?? "" },
        new() { Header = lang == "hr" ? "Datum"           : "Date",          Width = 14, ValueSelector = a => a.OccurredAt },
        new() { Header = lang == "hr" ? "Težina"          : "Severity",      Width = 10, ValueSelector = a => a.Severity },
        new() { Header = lang == "hr" ? "Šteta (EUR)"     : "Damage (EUR)",  Width = 12, ValueSelector = a => a.DamageEstimate ?? 0m },
        new() { Header = lang == "hr" ? "Pol. izvještaj"  : "Police Report", Width = 10, ValueSelector = a => !string.IsNullOrEmpty(a.PoliceReport) ? (lang == "hr" ? "Da" : "Yes") : (lang == "hr" ? "Ne" : "No") },
        new() { Header = lang == "hr" ? "Opis"            : "Description",   Width = 30, ValueSelector = a => a.Description },
    };

    private static AccidentDto MapToDto(Accident a) => new()
    {
        AccidentId = a.AccidentId,
        VehicleId = a.VehicleId,
        RegistrationNumber = a.Vehicle?.RegistrationNumber ?? string.Empty,
        VehicleMake = a.Vehicle?.Make?.Name ?? string.Empty,
        VehicleModel = a.Vehicle?.Model?.Name ?? string.Empty,
        DriverId = a.DriverId,
        DriverName = a.Driver?.Employee != null
            ? $"{a.Driver.Employee.FirstName} {a.Driver.Employee.LastName}"
            : null,
        OccurredAt = a.OccurredAt,
        Severity = a.Severity,
        Description = a.Description,
        DamageEstimate = a.DamageEstimate,
        PoliceReport = a.PoliceReport,
        Notes = a.Notes
    };
}

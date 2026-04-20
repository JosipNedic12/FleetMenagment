using System.Linq.Expressions;
using FleetManagement.Application.Common;
using FleetManagement.Application.Common.Filters;
using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Services;

public class OdometerLogService
{
    private readonly FleetDbContext _db;

    public OdometerLogService(FleetDbContext db)
    {
        _db = db;
    }

    private IQueryable<OdometerLog> BaseQuery() =>
        _db.OdometerLogs
            .Include(l => l.Vehicle).ThenInclude(v => v.Make)
            .Include(l => l.Vehicle).ThenInclude(v => v.Model);

    private static readonly Dictionary<string, Expression<Func<OdometerLog, object>>> AllowedSorts = new(StringComparer.OrdinalIgnoreCase)
    {
        ["vehicle"]    = l => l.Vehicle.RegistrationNumber,
        ["odometer"]   = l => l.OdometerKm,
        ["logDate"]    = l => l.LogDate
    };

    public async Task<PagedResponse<OdometerLogDto>> GetPagedAsync(PagedRequest<OdometerFilter> request)
    {
        var query = GetFilteredQueryable(request.Filter, request.Search);

        var totalCount = await query.CountAsync();

        var entities = await query
            .ApplySort(request.SortBy, request.IsDescending, AllowedSorts, l => l.LogDate)
            .ApplyPaging(request.Skip, request.PageSize)
            .ToListAsync();

        return PagedResponse<OdometerLogDto>.Create(
            entities.Select(MapToDto).ToList(), totalCount, request.Page, request.PageSize);
    }

    public IQueryable<OdometerLog> GetFilteredQueryable(OdometerFilter filter, string? search)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(l =>
                l.Vehicle.RegistrationNumber.ToLower().Contains(term) ||
                (l.Notes != null && l.Notes.ToLower().Contains(term)));
        }

        if (filter.VehicleId.HasValue)
            query = query.Where(l => l.VehicleId == filter.VehicleId.Value);

        if (filter.DateFrom.HasValue)
            query = query.Where(l => l.LogDate >= filter.DateFrom.Value);

        if (filter.DateTo.HasValue)
            query = query.Where(l => l.LogDate <= filter.DateTo.Value);

        return query;
    }

    public async Task<IEnumerable<OdometerLogDto>> GetAllAsync() =>
        await BaseQuery()
            .OrderByDescending(l => l.LogDate)
            .Select(l => MapToDto(l))
            .ToListAsync();

    public async Task<OdometerLogDto?> GetByIdAsync(int id)
    {
        var log = await BaseQuery().FirstOrDefaultAsync(l => l.LogId == id);
        if (log == null) throw new NotFoundException($"Odometer log with id {id} was not found.");
        return MapToDto(log);
    }

    public async Task<IEnumerable<OdometerLogDto>> GetByVehicleIdAsync(int vehicleId) =>
        await BaseQuery()
            .Where(l => l.VehicleId == vehicleId)
            .OrderByDescending(l => l.LogDate)
            .Select(l => MapToDto(l))
            .ToListAsync();

    public async Task<OdometerLogDto> CreateAsync(CreateOdometerLogDto dto)
    {
        var latest = await _db.OdometerLogs
            .Where(l => l.VehicleId == dto.VehicleId)
            .MaxAsync(l => (int?)l.OdometerKm);

        if (latest.HasValue && dto.OdometerKm < latest.Value)
            throw new ConflictException($"Odometer reading ({dto.OdometerKm} km) cannot be less than the current reading ({latest.Value} km).");

        var log = new OdometerLog
        {
            VehicleId = dto.VehicleId,
            OdometerKm = dto.OdometerKm,
            LogDate = dto.LogDate,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _db.OdometerLogs.Add(log);

        var vehicle = await _db.Vehicles.FindAsync(dto.VehicleId);
        if (vehicle != null && dto.OdometerKm > vehicle.CurrentOdometerKm)
        {
            vehicle.CurrentOdometerKm = dto.OdometerKm;
            vehicle.ModifiedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return MapToDto(await BaseQuery().FirstAsync(l => l.LogId == log.LogId));
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var log = await _db.OdometerLogs
            .Include(l => l.Vehicle)
            .FirstOrDefaultAsync(l => l.LogId == id);

        if (log == null) throw new NotFoundException($"Odometer log with id {id} was not found.");

        _db.OdometerLogs.Remove(log);

        var newMax = await _db.OdometerLogs
            .Where(l => l.VehicleId == log.VehicleId && l.LogId != id)
            .MaxAsync(l => (int?)l.OdometerKm) ?? 0;

        if (log.Vehicle != null)
        {
            log.Vehicle.CurrentOdometerKm = newMax;
            log.Vehicle.ModifiedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<OdometerLogDto>> GetFilteredDtosAsync(OdometerFilter filter, string? search)
    {
        var entities = await GetFilteredQueryable(filter, search).ToListAsync();
        return entities.Select(MapToDto).ToList();
    }

    public static List<ExportColumn<OdometerLogDto>> GetExportColumns(string lang = "hr") => new()
    {
        new() { Header = lang == "hr" ? "Vozilo"      : "Vehicle",       Width = 16, ValueSelector = l => l.RegistrationNumber },
        new() { Header = lang == "hr" ? "Kilometraža" : "Odometer (km)", Width = 14, ValueSelector = l => l.OdometerKm },
        new() { Header = lang == "hr" ? "Datum"       : "Date",          Width = 14, ValueSelector = l => l.LogDate },
        new() { Header = lang == "hr" ? "Napomena"    : "Notes",         Width = 30, ValueSelector = l => l.Notes ?? "" },
    };

    private static OdometerLogDto MapToDto(OdometerLog l) => new()
    {
        LogId = l.LogId,
        VehicleId = l.VehicleId,
        RegistrationNumber = l.Vehicle.RegistrationNumber,
        OdometerKm = l.OdometerKm,
        LogDate = l.LogDate,
        Notes = l.Notes,
        CreatedAt = l.CreatedAt
    };
}

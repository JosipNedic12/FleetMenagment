using System.Linq.Expressions;
using FleetManagement.Application.Common;
using FleetManagement.Application.Common.Filters;
using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FleetManagement.Infrastructure.Services;

public class FineService
{
    private readonly FleetDbContext _db;
    private readonly ILogger<FineService> _logger;

    public FineService(FleetDbContext db, ILogger<FineService> logger)
    {
        _db = db;
        _logger = logger;
    }

    private IQueryable<Fine> BaseQuery() =>
        _db.Fines
            .Include(f => f.Vehicle).ThenInclude(v => v.Make)
            .Include(f => f.Vehicle).ThenInclude(v => v.Model)
            .Include(f => f.Driver).ThenInclude(d => d!.Employee);

    private static readonly Dictionary<string, Expression<Func<Fine, object>>> AllowedSorts = new(StringComparer.OrdinalIgnoreCase)
    {
        ["vehicle"]    = f => f.Vehicle.RegistrationNumber,
        ["driver"]     = f => f.Driver!.Employee.LastName,
        ["occurredAt"] = f => f.OccurredAt,
        ["amount"]     = f => f.Amount,
        ["reason"]     = f => f.Reason
    };

    public async Task<PagedResponse<FineDto>> GetPagedAsync(PagedRequest<FineFilter> request)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(f =>
                f.Vehicle.RegistrationNumber.ToLower().Contains(term) ||
                f.Reason.ToLower().Contains(term) ||
                (f.Driver != null && (
                    f.Driver.Employee.FirstName.ToLower().Contains(term) ||
                    f.Driver.Employee.LastName.ToLower().Contains(term))));
        }

        var f2 = request.Filter;

        if (!string.IsNullOrWhiteSpace(f2.PaidStatus))
        {
            if (f2.PaidStatus == "paid")
                query = query.Where(f => f.PaidAt != null);
            else if (f2.PaidStatus == "unpaid")
                query = query.Where(f => f.PaidAt == null);
        }

        if (f2.VehicleId.HasValue)
            query = query.Where(f => f.VehicleId == f2.VehicleId.Value);

        if (f2.DriverId.HasValue)
            query = query.Where(f => f.DriverId == f2.DriverId.Value);

        if (f2.DateFrom.HasValue)
            query = query.Where(f => DateOnly.FromDateTime(f.OccurredAt) >= f2.DateFrom.Value);

        if (f2.DateTo.HasValue)
            query = query.Where(f => DateOnly.FromDateTime(f.OccurredAt) <= f2.DateTo.Value);

        var totalCount = await query.CountAsync();

        var entities = await query
            .ApplySort(request.SortBy, request.IsDescending, AllowedSorts, f => f.OccurredAt)
            .ApplyPaging(request.Skip, request.PageSize)
            .ToListAsync();

        return PagedResponse<FineDto>.Create(entities.Select(MapToDto).ToList(), totalCount, request.Page, request.PageSize);
    }

    public async Task<IEnumerable<FineDto>> GetAllAsync()
    {
        return await BaseQuery()
            .OrderByDescending(f => f.OccurredAt)
            .Select(f => MapToDto(f))
            .ToListAsync();
    }

    public async Task<IEnumerable<FineDto>> GetUnpaidAsync()
    {
        return await BaseQuery()
            .Where(f => f.PaidAt == null)
            .OrderByDescending(f => f.OccurredAt)
            .Select(f => MapToDto(f))
            .ToListAsync();
    }

    public async Task<FineDto?> GetByIdAsync(int id)
    {
        var fine = await BaseQuery().FirstOrDefaultAsync(f => f.FineId == id);
        if (fine == null)
            throw new NotFoundException($"Fine with id {id} was not found.");
        return MapToDto(fine);
    }

    public async Task<IEnumerable<FineDto>> GetByVehicleIdAsync(int vehicleId)
    {
        return await BaseQuery()
            .Where(f => f.VehicleId == vehicleId)
            .OrderByDescending(f => f.OccurredAt)
            .Select(f => MapToDto(f))
            .ToListAsync();
    }

    public async Task<IEnumerable<FineDto>> GetByDriverIdAsync(int driverId)
    {
        return await BaseQuery()
            .Where(f => f.DriverId == driverId)
            .OrderByDescending(f => f.OccurredAt)
            .Select(f => MapToDto(f))
            .ToListAsync();
    }

    public async Task<FineDto> CreateAsync(CreateFineDto dto)
    {
        var fine = new Fine
        {
            VehicleId = dto.VehicleId,
            DriverId = dto.DriverId,
            OccurredAt = dto.OccurredAt,
            Amount = dto.Amount,
            Reason = dto.Reason,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _db.Fines.Add(fine);
        await _db.SaveChangesAsync();

        return MapToDto(await BaseQuery().FirstAsync(f => f.FineId == fine.FineId));
    }

    public async Task<FineDto?> UpdateAsync(int id, UpdateFineDto dto)
    {
        var fine = await _db.Fines.FindAsync(id);
        if (fine == null)
            throw new NotFoundException($"Fine with id {id} was not found.");

        if (dto.DriverId.HasValue) fine.DriverId = dto.DriverId.Value;
        if (dto.OccurredAt.HasValue) fine.OccurredAt = dto.OccurredAt.Value;
        if (dto.Amount.HasValue) fine.Amount = dto.Amount.Value;
        if (dto.Reason != null) fine.Reason = dto.Reason;
        if (dto.Notes != null) fine.Notes = dto.Notes;
        fine.ModifiedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return MapToDto(await BaseQuery().FirstAsync(f => f.FineId == id));
    }

    public async Task<FineDto?> MarkPaidAsync(int id, MarkFinePaidDto dto)
    {
        var fine = await _db.Fines.FindAsync(id);
        if (fine == null)
            throw new NotFoundException($"Fine with id {id} was not found.");

        fine.PaidAt = dto.PaidAt;
        fine.PaymentMethod = dto.PaymentMethod;
        fine.ModifiedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Fine {Id} paid via {Method}", id, dto.PaymentMethod);

        return MapToDto(await BaseQuery().FirstAsync(f => f.FineId == id));
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var fine = await _db.Fines.FindAsync(id);
        if (fine == null)
            throw new NotFoundException($"Fine with id {id} was not found.");

        _db.Fines.Remove(fine);
        await _db.SaveChangesAsync();
        return true;
    }

    public IQueryable<Fine> GetFilteredQueryable(FineFilter filter, string? search)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(f =>
                f.Vehicle.RegistrationNumber.ToLower().Contains(term) ||
                f.Reason.ToLower().Contains(term) ||
                (f.Driver != null && (
                    f.Driver.Employee.FirstName.ToLower().Contains(term) ||
                    f.Driver.Employee.LastName.ToLower().Contains(term))));
        }

        if (!string.IsNullOrWhiteSpace(filter.PaidStatus))
        {
            if (filter.PaidStatus == "paid")
                query = query.Where(f => f.PaidAt != null);
            else if (filter.PaidStatus == "unpaid")
                query = query.Where(f => f.PaidAt == null);
        }

        if (filter.VehicleId.HasValue)
            query = query.Where(f => f.VehicleId == filter.VehicleId.Value);

        if (filter.DriverId.HasValue)
            query = query.Where(f => f.DriverId == filter.DriverId.Value);

        if (filter.DateFrom.HasValue)
            query = query.Where(f => DateOnly.FromDateTime(f.OccurredAt) >= filter.DateFrom.Value);

        if (filter.DateTo.HasValue)
            query = query.Where(f => DateOnly.FromDateTime(f.OccurredAt) <= filter.DateTo.Value);

        return query;
    }

    public async Task<List<FineDto>> GetFilteredDtosAsync(FineFilter filter, string? search)
    {
        var entities = await GetFilteredQueryable(filter, search).ToListAsync();
        return entities.Select(MapToDto).ToList();
    }

    public static List<ExportColumn<FineDto>> GetExportColumns(string lang = "hr") => new()
    {
        new() { Header = lang == "hr" ? "Vozilo"       : "Vehicle",      Width = 16, ValueSelector = f => f.RegistrationNumber },
        new() { Header = lang == "hr" ? "Vozač"        : "Driver",       Width = 22, ValueSelector = f => f.DriverName ?? "" },
        new() { Header = lang == "hr" ? "Datum"        : "Date",         Width = 14, ValueSelector = f => f.OccurredAt },
        new() { Header = lang == "hr" ? "Iznos (EUR)"  : "Amount (EUR)", Width = 12, ValueSelector = f => f.Amount },
        new() { Header = lang == "hr" ? "Razlog"       : "Reason",       Width = 24, ValueSelector = f => f.Reason },
        new() { Header = lang == "hr" ? "Plaćeno"      : "Paid",         Width = 10, ValueSelector = f => f.PaidAt.HasValue ? (lang == "hr" ? "Da" : "Yes") : (lang == "hr" ? "Ne" : "No") },
        new() { Header = lang == "hr" ? "Datum uplate" : "Paid At",      Width = 14, ValueSelector = f => f.PaidAt?.ToString("d") ?? "" },
    };

    private static FineDto MapToDto(Fine f) => new()
    {
        FineId = f.FineId,
        VehicleId = f.VehicleId,
        RegistrationNumber = f.Vehicle?.RegistrationNumber ?? string.Empty,
        VehicleMake = f.Vehicle?.Make?.Name ?? string.Empty,
        VehicleModel = f.Vehicle?.Model?.Name ?? string.Empty,
        DriverId = f.DriverId,
        DriverName = f.Driver?.Employee != null
            ? $"{f.Driver.Employee.FirstName} {f.Driver.Employee.LastName}"
            : null,
        OccurredAt = f.OccurredAt,
        Amount = f.Amount,
        Reason = f.Reason,
        PaidAt = f.PaidAt,
        PaymentMethod = f.PaymentMethod,
        IsPaid = f.PaidAt != null,
        Notes = f.Notes
    };
}

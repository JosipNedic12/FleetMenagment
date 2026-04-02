using System.Linq.Expressions;
using FleetManagement.Application.Common;
using FleetManagement.Application.Common.Filters;
using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Services;

public class RegistrationRecordService
{
    private readonly FleetDbContext _db;

    public RegistrationRecordService(FleetDbContext db)
    {
        _db = db;
    }

    private IQueryable<RegistrationRecord> BaseQuery() =>
        _db.RegistrationRecords
            .Include(r => r.Vehicle).ThenInclude(v => v.Make)
            .Include(r => r.Vehicle).ThenInclude(v => v.Model);

    private static readonly Dictionary<string, Expression<Func<RegistrationRecord, object>>> AllowedSorts = new(StringComparer.OrdinalIgnoreCase)
    {
        ["vehicle"]            = r => r.Vehicle.RegistrationNumber,
        ["registrationNumber"] = r => r.RegistrationNumber,
        ["validFrom"]          = r => r.ValidFrom,
        ["validTo"]            = r => r.ValidTo,
        ["fee"]                = r => r.Fee!
    };

    public async Task<PagedResponse<RegistrationRecordDto>> GetPagedAsync(PagedRequest<RegistrationFilter> request)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(r =>
                r.Vehicle.RegistrationNumber.ToLower().Contains(term) ||
                r.RegistrationNumber.ToLower().Contains(term));
        }

        var f = request.Filter;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        if (!string.IsNullOrWhiteSpace(f.Status))
        {
            if (f.Status == "valid")
                query = query.Where(r => r.ValidTo >= today);
            else if (f.Status == "expired")
                query = query.Where(r => r.ValidTo < today);
        }

        if (f.VehicleId.HasValue)
            query = query.Where(r => r.VehicleId == f.VehicleId.Value);

        var totalCount = await query.CountAsync();

        var entities = await query
            .ApplySort(request.SortBy, request.IsDescending, AllowedSorts, r => r.ValidTo)
            .ApplyPaging(request.Skip, request.PageSize)
            .ToListAsync();

        return PagedResponse<RegistrationRecordDto>.Create(entities.Select(MapToDto).ToList(), totalCount, request.Page, request.PageSize);
    }

    public async Task<IEnumerable<RegistrationRecordDto>> GetAllAsync()
    {
        return await BaseQuery()
            .OrderByDescending(r => r.ValidTo)
            .Select(r => MapToDto(r))
            .ToListAsync();
    }

    public async Task<RegistrationRecordDto?> GetByIdAsync(int id)
    {
        var record = await BaseQuery().FirstOrDefaultAsync(r => r.RegistrationId == id);
        if (record == null)
            throw new NotFoundException($"Registration record with id {id} was not found.");
        return MapToDto(record);
    }

    public async Task<IEnumerable<RegistrationRecordDto>> GetByVehicleIdAsync(int vehicleId)
    {
        return await BaseQuery()
            .Where(r => r.VehicleId == vehicleId)
            .OrderByDescending(r => r.ValidTo)
            .Select(r => MapToDto(r))
            .ToListAsync();
    }

    public async Task<RegistrationRecordDto?> GetCurrentByVehicleIdAsync(int vehicleId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var record = await BaseQuery()
            .Where(r => r.VehicleId == vehicleId && r.ValidFrom <= today && r.ValidTo >= today)
            .OrderByDescending(r => r.ValidTo)
            .FirstOrDefaultAsync();

        if (record == null)
            throw new NotFoundException($"No current registration record found for vehicle {vehicleId}.");
        return MapToDto(record);
    }

    public async Task<RegistrationRecordDto> CreateAsync(CreateRegistrationRecordDto dto)
    {
        var record = new RegistrationRecord
        {
            VehicleId = dto.VehicleId,
            RegistrationNumber = dto.RegistrationNumber.Trim(),
            ValidFrom = dto.ValidFrom,
            ValidTo = dto.ValidTo,
            Fee = dto.Fee,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _db.RegistrationRecords.Add(record);
        await _db.SaveChangesAsync();

        return MapToDto(await BaseQuery().FirstAsync(r => r.RegistrationId == record.RegistrationId));
    }

    public async Task<RegistrationRecordDto?> UpdateAsync(int id, UpdateRegistrationRecordDto dto)
    {
        var record = await _db.RegistrationRecords.FindAsync(id);
        if (record == null)
            throw new NotFoundException($"Registration record with id {id} was not found.");

        if (dto.RegistrationNumber != null) record.RegistrationNumber = dto.RegistrationNumber;
        if (dto.ValidFrom.HasValue) record.ValidFrom = dto.ValidFrom.Value;
        if (dto.ValidTo.HasValue) record.ValidTo = dto.ValidTo.Value;
        if (dto.Fee.HasValue) record.Fee = dto.Fee.Value;
        if (dto.Notes != null) record.Notes = dto.Notes;
        record.ModifiedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return MapToDto(await BaseQuery().FirstAsync(r => r.RegistrationId == id));
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var record = await _db.RegistrationRecords.FindAsync(id);
        if (record == null)
            throw new NotFoundException($"Registration record with id {id} was not found.");

        _db.RegistrationRecords.Remove(record);
        await _db.SaveChangesAsync();
        return true;
    }

    public IQueryable<RegistrationRecord> GetFilteredQueryable(RegistrationFilter filter, string? search)
    {
        var query = BaseQuery();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(r =>
                r.Vehicle.RegistrationNumber.ToLower().Contains(term) ||
                r.RegistrationNumber.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            if (filter.Status == "valid")
                query = query.Where(r => r.ValidTo >= today);
            else if (filter.Status == "expired")
                query = query.Where(r => r.ValidTo < today);
        }

        if (filter.VehicleId.HasValue)
            query = query.Where(r => r.VehicleId == filter.VehicleId.Value);

        return query;
    }

    public async Task<List<RegistrationRecordDto>> GetFilteredDtosAsync(RegistrationFilter filter, string? search)
    {
        var entities = await GetFilteredQueryable(filter, search).ToListAsync();
        return entities.Select(MapToDto).ToList();
    }

    public static List<ExportColumn<RegistrationRecordDto>> GetExportColumns() => new()
    {
        new() { Header = "Vehicle",    Width = 16, ValueSelector = r => r.VehicleRegistrationNumber },
        new() { Header = "Reg Number", Width = 18, ValueSelector = r => r.RegistrationNumber },
        new() { Header = "Valid From", Width = 14, ValueSelector = r => r.ValidFrom },
        new() { Header = "Valid To",   Width = 14, ValueSelector = r => r.ValidTo },
        new() { Header = "Fee (EUR)",  Width = 12, ValueSelector = r => r.Fee ?? 0m },
        new() { Header = "Status",     Width = 10, ValueSelector = r => r.IsActive ? "Valid" : "Expired" },
    };

    private static RegistrationRecordDto MapToDto(RegistrationRecord r)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return new()
        {
            RegistrationId = r.RegistrationId,
            VehicleId = r.VehicleId,
            VehicleRegistrationNumber = r.Vehicle?.RegistrationNumber ?? string.Empty,
            VehicleMake = r.Vehicle?.Make?.Name ?? string.Empty,
            VehicleModel = r.Vehicle?.Model?.Name ?? string.Empty,
            RegistrationNumber = r.RegistrationNumber,
            ValidFrom = r.ValidFrom,
            ValidTo = r.ValidTo,
            Fee = r.Fee,
            Notes = r.Notes,
            IsActive = r.ValidFrom <= today && r.ValidTo >= today
        };
    }
}

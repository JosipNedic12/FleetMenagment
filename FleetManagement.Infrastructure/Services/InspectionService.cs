using System.Linq.Expressions;
using FleetManagement.Application.Common;
using FleetManagement.Application.Common.Filters;
using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Services;

public class InspectionService
{
    private readonly FleetDbContext _db;

    public InspectionService(FleetDbContext db)
    {
        _db = db;
    }

    private IQueryable<Inspection> BaseQuery() =>
        _db.Inspections
            .Include(i => i.Vehicle).ThenInclude(v => v.Make)
            .Include(i => i.Vehicle).ThenInclude(v => v.Model);

    private static readonly Dictionary<string, Expression<Func<Inspection, object>>> AllowedSorts = new(StringComparer.OrdinalIgnoreCase)
    {
        ["vehicle"]     = i => i.Vehicle.RegistrationNumber,
        ["inspectedAt"] = i => i.InspectedAt,
        ["validTo"]     = i => i.ValidTo!,
        ["result"]      = i => i.Result
    };

    public async Task<PagedResponse<InspectionDto>> GetPagedAsync(PagedRequest<InspectionFilter> request)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(i => i.Vehicle.RegistrationNumber.ToLower().Contains(term));
        }

        var f = request.Filter;

        if (!string.IsNullOrWhiteSpace(f.Result))
            query = query.Where(i => i.Result == f.Result);

        if (f.VehicleId.HasValue)
            query = query.Where(i => i.VehicleId == f.VehicleId.Value);

        if (f.DateFrom.HasValue)
            query = query.Where(i => i.InspectedAt >= f.DateFrom.Value);

        if (f.DateTo.HasValue)
            query = query.Where(i => i.InspectedAt <= f.DateTo.Value);

        var totalCount = await query.CountAsync();

        var entities = await query
            .ApplySort(request.SortBy, request.IsDescending, AllowedSorts, i => i.InspectedAt)
            .ApplyPaging(request.Skip, request.PageSize)
            .ToListAsync();

        return PagedResponse<InspectionDto>.Create(entities.Select(MapToDto).ToList(), totalCount, request.Page, request.PageSize);
    }

    public async Task<IEnumerable<InspectionDto>> GetAllAsync()
    {
        return await BaseQuery()
            .OrderByDescending(i => i.InspectedAt)
            .Select(i => MapToDto(i))
            .ToListAsync();
    }

    public async Task<InspectionDto?> GetByIdAsync(int id)
    {
        var inspection = await BaseQuery().FirstOrDefaultAsync(i => i.InspectionId == id);
        if (inspection == null)
            throw new NotFoundException($"Inspection with id {id} was not found.");
        return MapToDto(inspection);
    }

    public async Task<IEnumerable<InspectionDto>> GetByVehicleIdAsync(int vehicleId)
    {
        return await BaseQuery()
            .Where(i => i.VehicleId == vehicleId)
            .OrderByDescending(i => i.InspectedAt)
            .Select(i => MapToDto(i))
            .ToListAsync();
    }

    public async Task<InspectionDto?> GetLatestByVehicleIdAsync(int vehicleId)
    {
        var inspection = await BaseQuery()
            .Where(i => i.VehicleId == vehicleId)
            .OrderByDescending(i => i.InspectedAt)
            .FirstOrDefaultAsync();

        if (inspection == null)
            throw new NotFoundException($"No inspection found for vehicle {vehicleId}.");
        return MapToDto(inspection);
    }

    private static readonly string[] ValidResults = ["passed", "failed", "conditional"];

    public async Task<InspectionDto> CreateAsync(CreateInspectionDto dto)
    {
        if (!ValidResults.Contains(dto.Result))
            throw new ArgumentException("result must be: passed | failed | conditional");

        if (dto.Result == "failed" && string.IsNullOrWhiteSpace(dto.Notes))
            throw new InvalidOperationException("Notes are required for failed inspections.");

        var inspection = new Inspection
        {
            VehicleId = dto.VehicleId,
            InspectedAt = dto.InspectedAt,
            ValidTo = dto.ValidTo,
            Result = dto.Result,
            Notes = dto.Notes,
            OdometerKm = dto.OdometerKm,
            CreatedAt = DateTime.UtcNow
        };

        _db.Inspections.Add(inspection);
        await _db.SaveChangesAsync();

        return MapToDto(await BaseQuery().FirstAsync(i => i.InspectionId == inspection.InspectionId));
    }

    public async Task<InspectionDto?> UpdateAsync(int id, UpdateInspectionDto dto)
    {
        var inspection = await _db.Inspections.FindAsync(id);
        if (inspection == null)
            throw new NotFoundException($"Inspection with id {id} was not found.");

        var resultToUse = dto.Result ?? inspection.Result;
        var notesToUse = dto.Notes ?? inspection.Notes;

        if (dto.Result != null && !ValidResults.Contains(dto.Result))
            throw new ArgumentException("result must be: passed | failed | conditional");

        if (resultToUse == "failed" && string.IsNullOrWhiteSpace(notesToUse))
            throw new InvalidOperationException("Notes are required for failed inspections.");

        if (dto.InspectedAt.HasValue) inspection.InspectedAt = dto.InspectedAt.Value;
        if (dto.ValidTo.HasValue) inspection.ValidTo = dto.ValidTo.Value;
        inspection.Result = resultToUse;
        inspection.Notes = notesToUse;
        if (dto.OdometerKm.HasValue) inspection.OdometerKm = dto.OdometerKm.Value;

        await _db.SaveChangesAsync();

        return MapToDto(await BaseQuery().FirstAsync(i => i.InspectionId == id));
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var inspection = await _db.Inspections.FindAsync(id);
        if (inspection == null)
            throw new NotFoundException($"Inspection with id {id} was not found.");

        _db.Inspections.Remove(inspection);
        await _db.SaveChangesAsync();
        return true;
    }

    public IQueryable<Inspection> GetFilteredQueryable(InspectionFilter filter, string? search)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(i => i.Vehicle.RegistrationNumber.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(filter.Result))
            query = query.Where(i => i.Result == filter.Result);

        if (filter.VehicleId.HasValue)
            query = query.Where(i => i.VehicleId == filter.VehicleId.Value);

        if (filter.DateFrom.HasValue)
            query = query.Where(i => i.InspectedAt >= filter.DateFrom.Value);

        if (filter.DateTo.HasValue)
            query = query.Where(i => i.InspectedAt <= filter.DateTo.Value);

        return query;
    }

    public async Task<List<InspectionDto>> GetFilteredDtosAsync(InspectionFilter filter, string? search)
    {
        var entities = await GetFilteredQueryable(filter, search).ToListAsync();
        return entities.Select(MapToDto).ToList();
    }

    public static List<ExportColumn<InspectionDto>> GetExportColumns() => new()
    {
        new() { Header = "Vehicle",       Width = 16, ValueSelector = i => i.RegistrationNumber },
        new() { Header = "Inspected At",  Width = 14, ValueSelector = i => i.InspectedAt },
        new() { Header = "Valid To",      Width = 14, ValueSelector = i => i.ValidTo },
        new() { Header = "Result",        Width = 10, ValueSelector = i => i.Result },
        new() { Header = "Odometer (km)", Width = 14, ValueSelector = i => i.OdometerKm ?? 0 },
    };

    private static InspectionDto MapToDto(Inspection i)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return new()
        {
            InspectionId = i.InspectionId,
            VehicleId = i.VehicleId,
            RegistrationNumber = i.Vehicle?.RegistrationNumber ?? string.Empty,
            VehicleMake = i.Vehicle?.Make?.Name ?? string.Empty,
            VehicleModel = i.Vehicle?.Model?.Name ?? string.Empty,
            InspectedAt = i.InspectedAt,
            ValidTo = i.ValidTo,
            Result = i.Result,
            Notes = i.Notes,
            OdometerKm = i.OdometerKm,
            IsValid = i.ValidTo.HasValue && i.ValidTo.Value >= today
        };
    }
}

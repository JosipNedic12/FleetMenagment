using System.Linq.Expressions;
using FleetManagement.Application.Common;
using FleetManagement.Application.Common.Filters;
using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Services;

public class FuelTransactionService
{
    private readonly FleetDbContext _db;

    public FuelTransactionService(FleetDbContext db)
    {
        _db = db;
    }

    private IQueryable<FuelTransaction> BaseQuery() =>
        _db.FuelTransactions
            .Include(t => t.Vehicle).ThenInclude(v => v.Make)
            .Include(t => t.Vehicle).ThenInclude(v => v.Model)
            .Include(t => t.FuelCard)
            .Include(t => t.FuelType);

    private static readonly Dictionary<string, Expression<Func<FuelTransaction, object>>> AllowedSorts = new(StringComparer.OrdinalIgnoreCase)
    {
        ["vehicle"]   = t => t.Vehicle.RegistrationNumber,
        ["postedAt"]  = t => t.PostedAt,
        ["liters"]    = t => t.Liters,
        ["totalCost"] = t => t.TotalCost,
        ["fuelType"]  = t => t.FuelType.Label,
        ["station"]   = t => t.StationName!
    };

    public async Task<PagedResponse<FuelTransactionDto>> GetPagedAsync(PagedRequest<FuelTransactionFilter> request)
    {
        var query = GetFilteredQueryable(request.Filter, request.Search);

        var totalCount = await query.CountAsync();

        var entities = await query
            .ApplySort(request.SortBy, request.IsDescending, AllowedSorts, t => t.PostedAt)
            .ApplyPaging(request.Skip, request.PageSize)
            .ToListAsync();

        return PagedResponse<FuelTransactionDto>.Create(
            entities.Select(MapToDto).ToList(), totalCount, request.Page, request.PageSize);
    }

    public IQueryable<FuelTransaction> GetFilteredQueryable(FuelTransactionFilter filter, string? search)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(t =>
                t.Vehicle.RegistrationNumber.ToLower().Contains(term) ||
                (t.StationName != null && t.StationName.ToLower().Contains(term)) ||
                (t.ReceiptNumber != null && t.ReceiptNumber.ToLower().Contains(term)));
        }

        if (filter.VehicleId.HasValue)
            query = query.Where(t => t.VehicleId == filter.VehicleId.Value);

        if (filter.FuelCardId.HasValue)
            query = query.Where(t => t.FuelCardId == filter.FuelCardId.Value);

        if (filter.FuelTypeId.HasValue)
            query = query.Where(t => t.FuelTypeId == filter.FuelTypeId.Value);

        if (filter.DateFrom.HasValue)
            query = query.Where(t => DateOnly.FromDateTime(t.PostedAt) >= filter.DateFrom.Value);

        if (filter.DateTo.HasValue)
            query = query.Where(t => DateOnly.FromDateTime(t.PostedAt) <= filter.DateTo.Value);

        return query;
    }

    public async Task<IEnumerable<FuelTransactionDto>> GetAllAsync() =>
        await BaseQuery()
            .OrderByDescending(t => t.PostedAt)
            .Select(t => MapToDto(t))
            .ToListAsync();

    public async Task<FuelTransactionDto?> GetByIdAsync(int id)
    {
        var transaction = await BaseQuery().FirstOrDefaultAsync(t => t.TransactionId == id);
        if (transaction == null) throw new NotFoundException($"Fuel transaction with id {id} was not found.");
        return MapToDto(transaction);
    }

    public async Task<IEnumerable<FuelTransactionDto>> GetByVehicleIdAsync(int vehicleId) =>
        await BaseQuery()
            .Where(t => t.VehicleId == vehicleId)
            .OrderByDescending(t => t.PostedAt)
            .Select(t => MapToDto(t))
            .ToListAsync();

    public async Task<FuelTransactionDto> CreateAsync(CreateFuelTransactionDto dto)
    {
        var transaction = new FuelTransaction
        {
            VehicleId = dto.VehicleId,
            FuelCardId = dto.FuelCardId,
            FuelTypeId = dto.FuelTypeId,
            PostedAt = DateTime.SpecifyKind(dto.PostedAt, DateTimeKind.Utc),
            OdometerKm = dto.OdometerKm,
            Liters = dto.Liters,
            PricePerLiter = dto.PricePerLiter,
            EnergyKwh = dto.EnergyKwh,
            PricePerKwh = dto.PricePerKwh,
            TotalCost = dto.TotalCost,
            StationName = dto.StationName,
            ReceiptNumber = dto.ReceiptNumber,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _db.FuelTransactions.Add(transaction);

        if (dto.OdometerKm.HasValue)
        {
            var vehicle = await _db.Vehicles.FindAsync(dto.VehicleId);
            if (vehicle != null && dto.OdometerKm.Value > vehicle.CurrentOdometerKm)
            {
                vehicle.CurrentOdometerKm = dto.OdometerKm.Value;
                vehicle.ModifiedAt = DateTime.UtcNow;

                _db.OdometerLogs.Add(new OdometerLog
                {
                    VehicleId = dto.VehicleId,
                    OdometerKm = dto.OdometerKm.Value,
                    LogDate = DateOnly.FromDateTime(transaction.PostedAt),
                    Notes = "Auto-logged from fuel transaction",
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        await _db.SaveChangesAsync();
        return MapToDto(await BaseQuery().FirstAsync(t => t.TransactionId == transaction.TransactionId));
    }

    public async Task<bool> MarkSuspiciousAsync(int id, bool isSuspicious)
    {
        var transaction = await _db.FuelTransactions.FindAsync(id);
        if (transaction == null) throw new NotFoundException($"Fuel transaction with id {id} was not found.");

        transaction.IsSuspicious = isSuspicious;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var transaction = await _db.FuelTransactions.FindAsync(id);
        if (transaction == null) throw new NotFoundException($"Fuel transaction with id {id} was not found.");

        _db.FuelTransactions.Remove(transaction);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<FuelTransactionDto>> GetFilteredDtosAsync(FuelTransactionFilter filter, string? search)
    {
        var entities = await GetFilteredQueryable(filter, search).ToListAsync();
        return entities.Select(MapToDto).ToList();
    }

    public static List<ExportColumn<FuelTransactionDto>> GetExportColumns(string lang = "hr") => new()
    {
        new() { Header = lang == "hr" ? "Vozilo"        : "Vehicle",       Width = 16, ValueSelector = t => t.RegistrationNumber },
        new() { Header = lang == "hr" ? "Datum"         : "Date",          Width = 14, ValueSelector = t => t.PostedAt },
        new() { Header = lang == "hr" ? "Vrsta goriva"  : "Fuel Type",     Width = 12, ValueSelector = t => t.FuelTypeName },
        new() { Header = lang == "hr" ? "Litri"         : "Liters",        Width = 10, ValueSelector = t => t.Liters },
        new() { Header = lang == "hr" ? "Cijena/L"      : "Price/L",       Width = 10, ValueSelector = t => t.PricePerLiter },
        new() { Header = lang == "hr" ? "Ukupno"        : "Total Cost",    Width = 12, ValueSelector = t => t.TotalCost },
        new() { Header = lang == "hr" ? "Postaja"       : "Station",       Width = 18, ValueSelector = t => t.StationName ?? "" },
        new() { Header = lang == "hr" ? "Kilometraža"   : "Odometer (km)", Width = 14, ValueSelector = t => t.OdometerKm ?? 0 },
    };

    private static FuelTransactionDto MapToDto(FuelTransaction t) => new()
    {
        TransactionId = t.TransactionId,
        VehicleId = t.VehicleId,
        RegistrationNumber = t.Vehicle.RegistrationNumber,
        VehicleMake = t.Vehicle.Make?.Name,
        VehicleModel = t.Vehicle.Model?.Name,
        FuelCardId = t.FuelCardId,
        CardNumber = t.FuelCard?.CardNumber,
        FuelTypeId = t.FuelTypeId,
        FuelTypeName = t.FuelType.Label,
        PostedAt = t.PostedAt,
        OdometerKm = t.OdometerKm,
        Liters = t.Liters,
        PricePerLiter = t.PricePerLiter,
        EnergyKwh = t.EnergyKwh,
        PricePerKwh = t.PricePerKwh,
        TotalCost = t.TotalCost,
        StationName = t.StationName,
        ReceiptNumber = t.ReceiptNumber,
        IsSuspicious = t.IsSuspicious,
        Notes = t.Notes
    };
}

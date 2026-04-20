using System.Linq.Expressions;
using FleetManagement.Application.Common;
using FleetManagement.Application.Common.Filters;
using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using static FleetManagement.Application.Exceptions.ErrorMessageKeys;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Services;

public class FuelCardService
{
    private readonly FleetDbContext _db;

    public FuelCardService(FleetDbContext db)
    {
        _db = db;
    }

    private IQueryable<FuelCard> BaseQuery() =>
        _db.FuelCards
            .Include(c => c.AssignedVehicle).ThenInclude(v => v!.Make)
            .Include(c => c.AssignedVehicle).ThenInclude(v => v!.Model);

    private static readonly Dictionary<string, Expression<Func<FuelCard, object>>> AllowedSorts = new(StringComparer.OrdinalIgnoreCase)
    {
        ["cardNumber"] = c => c.CardNumber,
        ["provider"]   = c => c.Provider!,
        ["vehicle"]    = c => c.AssignedVehicle!.RegistrationNumber,
        ["validTo"]    = c => c.ValidTo!
    };

    public async Task<PagedResponse<FuelCardDto>> GetPagedAsync(PagedRequest<FuelCardFilter> request)
    {
        var query = GetFilteredQueryable(request.Filter, request.Search);

        var totalCount = await query.CountAsync();

        var entities = await query
            .ApplySort(request.SortBy, request.IsDescending, AllowedSorts, c => c.CardNumber)
            .ApplyPaging(request.Skip, request.PageSize)
            .ToListAsync();

        return PagedResponse<FuelCardDto>.Create(
            entities.Select(MapToDto).ToList(), totalCount, request.Page, request.PageSize);
    }

    public IQueryable<FuelCard> GetFilteredQueryable(FuelCardFilter filter, string? search)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c =>
                c.CardNumber.ToLower().Contains(term) ||
                (c.Provider != null && c.Provider.ToLower().Contains(term)));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            query = filter.Status switch
            {
                "active"   => query.Where(c => c.IsActive && (c.ValidTo == null || c.ValidTo >= today)),
                "inactive" => query.Where(c => !c.IsActive),
                "expired"  => query.Where(c => c.ValidTo != null && c.ValidTo < today),
                _          => query
            };
        }

        if (filter.VehicleId.HasValue)
            query = query.Where(c => c.AssignedVehicleId == filter.VehicleId.Value);

        if (!string.IsNullOrWhiteSpace(filter.Provider))
            query = query.Where(c => c.Provider == filter.Provider);

        return query;
    }

    public async Task<IEnumerable<FuelCardDto>> GetAllAsync() =>
        await BaseQuery()
            .OrderBy(c => c.CardNumber)
            .Select(c => MapToDto(c))
            .ToListAsync();

    public async Task<FuelCardDto?> GetByIdAsync(int id)
    {
        var card = await BaseQuery().FirstOrDefaultAsync(c => c.FuelCardId == id);
        if (card == null) throw new NotFoundException(FuelCardNotFound);
        return MapToDto(card);
    }

    public async Task<IEnumerable<FuelCardDto>> GetByVehicleIdAsync(int vehicleId) =>
        await BaseQuery()
            .Where(c => c.AssignedVehicleId == vehicleId)
            .Select(c => MapToDto(c))
            .ToListAsync();

    public async Task<FuelCardDto> CreateAsync(CreateFuelCardDto dto)
    {
        var cardNumberNorm = dto.CardNumber.Trim().ToUpper();
        var exists = await _db.FuelCards.AnyAsync(c => c.CardNumber == cardNumberNorm);
        if (exists)
            throw new ConflictException(FuelCardNumberDuplicate);

        var card = new FuelCard
        {
            CardNumber = cardNumberNorm,
            Provider = dto.Provider,
            AssignedVehicleId = dto.AssignedVehicleId,
            ValidFrom = dto.ValidFrom,
            ValidTo = dto.ValidTo,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _db.FuelCards.Add(card);
        await _db.SaveChangesAsync();
        return MapToDto(await BaseQuery().FirstAsync(c => c.FuelCardId == card.FuelCardId));
    }

    public async Task<FuelCardDto?> UpdateAsync(int id, UpdateFuelCardDto dto)
    {
        var card = await _db.FuelCards.FindAsync(id);
        if (card == null) throw new NotFoundException(FuelCardNotFound);

        card.Provider = dto.Provider;
        card.AssignedVehicleId = dto.AssignedVehicleId;
        card.ValidFrom = dto.ValidFrom;
        card.ValidTo = dto.ValidTo;
        card.IsActive = dto.IsActive ?? true;
        card.Notes = dto.Notes;
        card.ModifiedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return MapToDto(await BaseQuery().FirstAsync(c => c.FuelCardId == id));
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var card = await _db.FuelCards.FindAsync(id);
        if (card == null) throw new NotFoundException(FuelCardNotFound);

        card.IsActive = false;
        card.ModifiedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<FuelCardDto>> GetFilteredDtosAsync(FuelCardFilter filter, string? search)
    {
        var entities = await GetFilteredQueryable(filter, search).ToListAsync();
        return entities.Select(MapToDto).ToList();
    }

    public static List<ExportColumn<FuelCardDto>> GetExportColumns(string lang = "hr") => new()
    {
        new() { Header = lang == "hr" ? "Broj kartice"  : "Card Number",  Width = 20, ValueSelector = c => c.CardNumber },
        new() { Header = lang == "hr" ? "Dobavljač"     : "Provider",     Width = 15, ValueSelector = c => c.Provider ?? "" },
        new() { Header = lang == "hr" ? "Reg. oznaka"   : "Vehicle Reg.", Width = 18, ValueSelector = c => c.RegistrationNumber ?? "" },
        new() { Header = lang == "hr" ? "Marka"         : "Make",         Width = 12, ValueSelector = c => c.VehicleMake ?? "" },
        new() { Header = lang == "hr" ? "Model"         : "Model",        Width = 12, ValueSelector = c => c.VehicleModel ?? "" },
        new() { Header = lang == "hr" ? "Vrijedi od"    : "Valid From",   Width = 14, ValueSelector = c => c.ValidFrom.HasValue ? (object)c.ValidFrom.Value : "" },
        new() { Header = lang == "hr" ? "Vrijedi do"    : "Valid To",     Width = 14, ValueSelector = c => c.ValidTo.HasValue ? (object)c.ValidTo.Value : "" },
        new() { Header = lang == "hr" ? "Aktivna"       : "Active",       Width = 10, ValueSelector = c => c.IsActive ? (lang == "hr" ? "Da" : "Yes") : (lang == "hr" ? "Ne" : "No") },
        new() { Header = lang == "hr" ? "Napomena"      : "Notes",        Width = 25, ValueSelector = c => c.Notes ?? "" },
    };

    private static FuelCardDto MapToDto(FuelCard c) => new()
    {
        FuelCardId = c.FuelCardId,
        CardNumber = c.CardNumber,
        Provider = c.Provider,
        AssignedVehicleId = c.AssignedVehicleId,
        RegistrationNumber = c.AssignedVehicle?.RegistrationNumber,
        VehicleMake = c.AssignedVehicle?.Make?.Name,
        VehicleModel = c.AssignedVehicle?.Model?.Name,
        ValidFrom = c.ValidFrom,
        ValidTo = c.ValidTo,
        IsActive = c.IsActive,
        Notes = c.Notes
    };
}

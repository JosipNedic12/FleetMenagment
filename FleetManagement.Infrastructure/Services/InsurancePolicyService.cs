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

public class InsurancePolicyService
{
    private readonly FleetDbContext _db;

    public InsurancePolicyService(FleetDbContext db)
    {
        _db = db;
    }

    private IQueryable<InsurancePolicy> BaseQuery() =>
        _db.InsurancePolicies
            .Include(p => p.Vehicle).ThenInclude(v => v.Make)
            .Include(p => p.Vehicle).ThenInclude(v => v.Model);

    private static readonly Dictionary<string, Expression<Func<InsurancePolicy, object>>> AllowedSorts = new(StringComparer.OrdinalIgnoreCase)
    {
        ["vehicle"]   = p => p.Vehicle.RegistrationNumber,
        ["insurer"]   = p => p.Insurer,
        ["validFrom"] = p => p.ValidFrom,
        ["validTo"]   = p => p.ValidTo,
        ["premium"]   = p => p.Premium
    };

    public async Task<PagedResponse<InsurancePolicyDto>> GetPagedAsync(PagedRequest<InsuranceFilter> request)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(p =>
                p.Vehicle.RegistrationNumber.ToLower().Contains(term) ||
                p.PolicyNumber.ToLower().Contains(term) ||
                p.Insurer.ToLower().Contains(term));
        }

        var f = request.Filter;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        if (!string.IsNullOrWhiteSpace(f.Status))
        {
            if (f.Status == "active")
                query = query.Where(p => p.ValidTo >= today);
            else if (f.Status == "expired")
                query = query.Where(p => p.ValidTo < today);
        }

        if (f.VehicleId.HasValue)
            query = query.Where(p => p.VehicleId == f.VehicleId.Value);

        if (!string.IsNullOrWhiteSpace(f.Insurer))
            query = query.Where(p => p.Insurer == f.Insurer);

        var totalCount = await query.CountAsync();

        var entities = await query
            .ApplySort(request.SortBy, request.IsDescending, AllowedSorts, p => p.ValidTo)
            .ApplyPaging(request.Skip, request.PageSize)
            .ToListAsync();

        return PagedResponse<InsurancePolicyDto>.Create(entities.Select(MapToDto).ToList(), totalCount, request.Page, request.PageSize);
    }

    public async Task<IEnumerable<InsurancePolicyDto>> GetAllAsync()
    {
        return await BaseQuery()
            .OrderByDescending(p => p.ValidTo)
            .Select(p => MapToDto(p))
            .ToListAsync();
    }

    public async Task<IEnumerable<InsurancePolicyDto>> GetActiveAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return await BaseQuery()
            .Where(p => p.ValidTo >= today)
            .OrderByDescending(p => p.ValidTo)
            .Select(p => MapToDto(p))
            .ToListAsync();
    }

    public async Task<InsurancePolicyDto?> GetByIdAsync(int id)
    {
        var policy = await BaseQuery().FirstOrDefaultAsync(p => p.PolicyId == id);
        if (policy == null)
            throw new NotFoundException(InsurancePolicyNotFound);
        return MapToDto(policy);
    }

    public async Task<IEnumerable<InsurancePolicyDto>> GetByVehicleIdAsync(int vehicleId)
    {
        return await BaseQuery()
            .Where(p => p.VehicleId == vehicleId)
            .OrderByDescending(p => p.ValidTo)
            .Select(p => MapToDto(p))
            .ToListAsync();
    }

    public async Task<InsurancePolicyDto> CreateAsync(CreateInsurancePolicyDto dto)
    {
        var policyNumberNorm = dto.PolicyNumber.Trim();

        var numberExists = await _db.InsurancePolicies.AnyAsync(p => p.PolicyNumber == policyNumberNorm);
        if (numberExists)
            throw new ConflictException(InsurancePolicyNumberDuplicate);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var hasActivePolicy = await _db.InsurancePolicies.AnyAsync(p =>
            p.VehicleId == dto.VehicleId &&
            p.ValidFrom <= dto.ValidTo &&
            p.ValidTo >= dto.ValidFrom);
        if (hasActivePolicy)
            throw new ConflictException(InsurancePolicyOverlap);

        var policy = new InsurancePolicy
        {
            VehicleId = dto.VehicleId,
            PolicyNumber = policyNumberNorm,
            Insurer = dto.Insurer.Trim(),
            ValidFrom = dto.ValidFrom,
            ValidTo = dto.ValidTo,
            Premium = dto.Premium,
            CoverageNotes = dto.CoverageNotes,
            CreatedAt = DateTime.UtcNow
        };

        _db.InsurancePolicies.Add(policy);
        await _db.SaveChangesAsync();

        return MapToDto(await BaseQuery().FirstAsync(p => p.PolicyId == policy.PolicyId));
    }

    public async Task<InsurancePolicyDto?> UpdateAsync(int id, UpdateInsurancePolicyDto dto)
    {
        var policy = await _db.InsurancePolicies.FindAsync(id);
        if (policy == null)
            throw new NotFoundException(InsurancePolicyNotFound);

        var newValidFrom = dto.ValidFrom ?? policy.ValidFrom;
        var newValidTo = dto.ValidTo ?? policy.ValidTo;

        var overlaps = await _db.InsurancePolicies.AnyAsync(p =>
            p.PolicyId != id &&
            p.VehicleId == policy.VehicleId &&
            p.ValidFrom <= newValidTo &&
            p.ValidTo >= newValidFrom);
        if (overlaps)
            throw new ConflictException(InsurancePolicyOverlap);

        if (dto.Insurer != null) policy.Insurer = dto.Insurer;
        if (dto.ValidFrom.HasValue) policy.ValidFrom = dto.ValidFrom.Value;
        if (dto.ValidTo.HasValue) policy.ValidTo = dto.ValidTo.Value;
        if (dto.Premium.HasValue) policy.Premium = dto.Premium.Value;
        if (dto.CoverageNotes != null) policy.CoverageNotes = dto.CoverageNotes;
        policy.ModifiedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return MapToDto(await BaseQuery().FirstAsync(p => p.PolicyId == id));
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var policy = await _db.InsurancePolicies.FindAsync(id);
        if (policy == null)
            throw new NotFoundException(InsurancePolicyNotFound);

        _db.InsurancePolicies.Remove(policy);
        await _db.SaveChangesAsync();
        return true;
    }

    public IQueryable<InsurancePolicy> GetFilteredQueryable(InsuranceFilter filter, string? search)
    {
        var query = BaseQuery();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(p =>
                p.Vehicle.RegistrationNumber.ToLower().Contains(term) ||
                p.PolicyNumber.ToLower().Contains(term) ||
                p.Insurer.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            if (filter.Status == "active")
                query = query.Where(p => p.ValidTo >= today);
            else if (filter.Status == "expired")
                query = query.Where(p => p.ValidTo < today);
        }

        if (filter.VehicleId.HasValue)
            query = query.Where(p => p.VehicleId == filter.VehicleId.Value);

        if (!string.IsNullOrWhiteSpace(filter.Insurer))
            query = query.Where(p => p.Insurer == filter.Insurer);

        return query;
    }

    public async Task<List<InsurancePolicyDto>> GetFilteredDtosAsync(InsuranceFilter filter, string? search)
    {
        var entities = await GetFilteredQueryable(filter, search).ToListAsync();
        return entities.Select(MapToDto).ToList();
    }

    public static List<ExportColumn<InsurancePolicyDto>> GetExportColumns(string lang = "hr") => new()
    {
        new() { Header = lang == "hr" ? "Vozilo"         : "Vehicle",       Width = 16, ValueSelector = p => p.RegistrationNumber },
        new() { Header = lang == "hr" ? "Broj police"    : "Policy #",      Width = 18, ValueSelector = p => p.PolicyNumber },
        new() { Header = lang == "hr" ? "Osiguravatelj"  : "Insurer",       Width = 18, ValueSelector = p => p.Insurer },
        new() { Header = lang == "hr" ? "Vrijedi od"     : "Valid From",    Width = 14, ValueSelector = p => p.ValidFrom },
        new() { Header = lang == "hr" ? "Vrijedi do"     : "Valid To",      Width = 14, ValueSelector = p => p.ValidTo },
        new() { Header = lang == "hr" ? "Premija (EUR)"  : "Premium (EUR)", Width = 14, ValueSelector = p => p.Premium },
        new() { Header = lang == "hr" ? "Status"         : "Status",        Width = 10, ValueSelector = p => p.IsActive ? (lang == "hr" ? "Aktivna" : "Active") : (lang == "hr" ? "Istekla" : "Expired") },
    };

    private static InsurancePolicyDto MapToDto(InsurancePolicy p) => new()
    {
        PolicyId = p.PolicyId,
        VehicleId = p.VehicleId,
        RegistrationNumber = p.Vehicle?.RegistrationNumber ?? string.Empty,
        VehicleMake = p.Vehicle?.Make?.Name ?? string.Empty,
        VehicleModel = p.Vehicle?.Model?.Name ?? string.Empty,
        PolicyNumber = p.PolicyNumber,
        Insurer = p.Insurer,
        ValidFrom = p.ValidFrom,
        ValidTo = p.ValidTo,
        Premium = p.Premium,
        CoverageNotes = p.CoverageNotes,
        IsActive = p.ValidTo >= DateOnly.FromDateTime(DateTime.UtcNow)
    };
}

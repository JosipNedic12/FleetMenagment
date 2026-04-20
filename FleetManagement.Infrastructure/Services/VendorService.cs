using System.Linq.Expressions;
using FleetManagement.Application.Common;
using FleetManagement.Application.Common.Filters;
using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Services;

public class VendorService
{
    private readonly FleetDbContext _db;

    public VendorService(FleetDbContext db)
    {
        _db = db;
    }

    private IQueryable<Vendor> BaseQuery() =>
        _db.Vendors.Where(v => !v.IsDeleted);

    private static readonly Dictionary<string, Expression<Func<Vendor, object>>> AllowedSorts = new(StringComparer.OrdinalIgnoreCase)
    {
        ["name"]     = v => v.Name,
        ["email"]    = v => v.Email!,
        ["phone"]    = v => v.Phone!,
        ["isActive"] = v => v.IsActive
    };

    public async Task<PagedResponse<VendorDto>> GetPagedAsync(PagedRequest<VendorFilter> request)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(v =>
                v.Name.ToLower().Contains(term) ||
                (v.ContactPerson != null && v.ContactPerson.ToLower().Contains(term)) ||
                (v.Email != null && v.Email.ToLower().Contains(term)));
        }

        var f = request.Filter;

        if (!string.IsNullOrWhiteSpace(f.Status))
        {
            if (f.Status == "active")
                query = query.Where(v => v.IsActive);
            else if (f.Status == "inactive")
                query = query.Where(v => !v.IsActive);
        }

        var totalCount = await query.CountAsync();

        var entities = await query
            .ApplySort(request.SortBy, request.IsDescending, AllowedSorts, v => v.Name)
            .ApplyPaging(request.Skip, request.PageSize)
            .ToListAsync();

        return PagedResponse<VendorDto>.Create(entities.Select(MapToDto).ToList(), totalCount, request.Page, request.PageSize);
    }

    public async Task<IEnumerable<VendorDto>> GetAllAsync()
    {
        return await BaseQuery()
            .OrderBy(v => v.Name)
            .Select(v => MapToDto(v))
            .ToListAsync();
    }

    public async Task<VendorDto?> GetByIdAsync(int id)
    {
        var vendor = await BaseQuery().FirstOrDefaultAsync(v => v.VendorId == id);
        if (vendor == null)
            throw new NotFoundException($"Vendor with id {id} was not found.");
        return MapToDto(vendor);
    }

    public async Task<VendorDto> CreateAsync(CreateVendorDto dto)
    {
        var vendor = new Vendor
        {
            Name = dto.Name.Trim(),
            ContactPerson = dto.ContactPerson,
            Phone = dto.Phone,
            Email = dto.Email,
            Address = dto.Address,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Vendors.Add(vendor);
        await _db.SaveChangesAsync();

        return MapToDto(await BaseQuery().FirstAsync(v => v.VendorId == vendor.VendorId));
    }

    public async Task<VendorDto?> UpdateAsync(int id, UpdateVendorDto dto)
    {
        var vendor = await _db.Vendors.FirstOrDefaultAsync(v => v.VendorId == id && !v.IsDeleted);
        if (vendor == null)
            throw new NotFoundException($"Vendor with id {id} was not found.");

        if (dto.ContactPerson != null) vendor.ContactPerson = dto.ContactPerson;
        if (dto.Phone != null) vendor.Phone = dto.Phone;
        if (dto.Email != null) vendor.Email = dto.Email;
        if (dto.Address != null) vendor.Address = dto.Address;
        if (dto.IsActive.HasValue) vendor.IsActive = dto.IsActive.Value;
        vendor.ModifiedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return MapToDto(await BaseQuery().FirstAsync(v => v.VendorId == id));
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var vendor = await _db.Vendors.FirstOrDefaultAsync(v => v.VendorId == id && !v.IsDeleted);
        if (vendor == null)
            throw new NotFoundException($"Vendor with id {id} was not found.");

        vendor.IsDeleted = true;
        vendor.ModifiedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public IQueryable<Vendor> GetFilteredQueryable(VendorFilter filter, string? search)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(v =>
                v.Name.ToLower().Contains(term) ||
                (v.ContactPerson != null && v.ContactPerson.ToLower().Contains(term)) ||
                (v.Email != null && v.Email.ToLower().Contains(term)));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            if (filter.Status == "active")
                query = query.Where(v => v.IsActive);
            else if (filter.Status == "inactive")
                query = query.Where(v => !v.IsActive);
        }

        return query;
    }

    public async Task<List<VendorDto>> GetFilteredDtosAsync(VendorFilter filter, string? search)
    {
        var entities = await GetFilteredQueryable(filter, search).ToListAsync();
        return entities.Select(MapToDto).ToList();
    }

    public static List<ExportColumn<VendorDto>> GetExportColumns(string lang = "hr") => new()
    {
        new() { Header = lang == "hr" ? "Naziv"            : "Name",           Width = 25, ValueSelector = v => v.Name },
        new() { Header = lang == "hr" ? "Kontakt osoba"    : "Contact Person", Width = 20, ValueSelector = v => v.ContactPerson ?? "" },
        new() { Header = lang == "hr" ? "Telefon"          : "Phone",          Width = 15, ValueSelector = v => v.Phone ?? "" },
        new() { Header = "Email",                                               Width = 25, ValueSelector = v => v.Email ?? "" },
        new() { Header = lang == "hr" ? "Adresa"           : "Address",        Width = 30, ValueSelector = v => v.Address ?? "" },
        new() { Header = lang == "hr" ? "Aktivan"          : "Active",         Width = 10, ValueSelector = v => v.IsActive ? (lang == "hr" ? "Da" : "Yes") : (lang == "hr" ? "Ne" : "No") },
    };

    private static VendorDto MapToDto(Vendor v) => new()
    {
        VendorId = v.VendorId,
        Name = v.Name,
        ContactPerson = v.ContactPerson,
        Phone = v.Phone,
        Email = v.Email,
        Address = v.Address,
        IsActive = v.IsActive
    };
}

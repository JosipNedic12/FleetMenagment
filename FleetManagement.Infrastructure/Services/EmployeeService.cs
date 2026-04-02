using System.Linq.Expressions;
using FleetManagement.Application.Common;
using FleetManagement.Application.Common.Filters;
using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Services;

public class EmployeeService
{
    private readonly FleetDbContext _db;

    public EmployeeService(FleetDbContext db)
    {
        _db = db;
    }

    private IQueryable<Employee> BaseQuery() =>
        _db.Employees
            .Include(e => e.Driver)
            .Include(e => e.AppUser)
            .Where(e => !e.IsDeleted);

    private static readonly Dictionary<string, Expression<Func<Employee, object>>> AllowedSorts = new(StringComparer.OrdinalIgnoreCase)
    {
        ["lastName"]   = e => e.LastName,
        ["firstName"]  = e => e.FirstName,
        ["email"]      = e => e.Email,
        ["department"] = e => e.Department!
    };

    public async Task<PagedResponse<EmployeeDto>> GetPagedAsync(PagedRequest<EmployeeFilter> request)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(e =>
                (e.FirstName + " " + e.LastName).ToLower().Contains(term) ||
                e.Email.ToLower().Contains(term));
        }

        var f = request.Filter;

        if (!string.IsNullOrWhiteSpace(f.Status))
        {
            var isActive = f.Status == "active";
            query = query.Where(e => e.IsActive == isActive);
        }

        if (!string.IsNullOrWhiteSpace(f.Department))
            query = query.Where(e => e.Department == f.Department);

        var totalCount = await query.CountAsync();

        var entities = await query
            .ApplySort(request.SortBy, request.IsDescending, AllowedSorts, e => e.LastName)
            .ApplyPaging(request.Skip, request.PageSize)
            .ToListAsync();

        var items = entities.Select(MapToDto).ToList();

        return PagedResponse<EmployeeDto>.Create(items, totalCount, request.Page, request.PageSize);
    }

    public async Task<IEnumerable<EmployeeDto>> GetAllAsync()
    {
        return await BaseQuery()
            .OrderBy(e => e.LastName)
            .Select(e => MapToDto(e))
            .ToListAsync();
    }

    public async Task<EmployeeDto?> GetByIdAsync(int id)
    {
        var employee = await BaseQuery().FirstOrDefaultAsync(e => e.EmployeeId == id);
        if (employee == null) throw new NotFoundException($"Employee with id {id} was not found.");
        return MapToDto(employee);
    }

    public async Task<EmployeeDto> CreateAsync(CreateEmployeeDto dto)
    {
        var emailExists = await _db.Employees.AnyAsync(e => !e.IsDeleted && e.Email == dto.Email);
        if (emailExists) throw new ConflictException("An employee with this email already exists.");

        var employee = new Employee
        {
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim(),
            Department = dto.Department,
            Email = dto.Email.ToLower().Trim(),
            Phone = dto.Phone,
            CreatedAt = DateTime.UtcNow
        };

        _db.Employees.Add(employee);
        await _db.SaveChangesAsync();

        return MapToDto(await BaseQuery().FirstAsync(e => e.EmployeeId == employee.EmployeeId));
    }

    public async Task<EmployeeDto?> UpdateAsync(int id, UpdateEmployeeDto dto)
    {
        var employee = await _db.Employees.FindAsync(id);
        if (employee == null || employee.IsDeleted)
            throw new NotFoundException($"Employee with id {id} was not found.");

        employee.Department = dto.Department;
        employee.Phone = dto.Phone;
        employee.IsActive = dto.IsActive ?? true;
        employee.ModifiedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return MapToDto(await BaseQuery().FirstAsync(e => e.EmployeeId == id));
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var employee = await _db.Employees.FindAsync(id);
        if (employee == null || employee.IsDeleted)
            throw new NotFoundException($"Employee with id {id} was not found.");

        employee.IsDeleted = true;
        employee.ModifiedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public IQueryable<Employee> GetFilteredQueryable(EmployeeFilter filter, string? search)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(e =>
                (e.FirstName + " " + e.LastName).ToLower().Contains(term) ||
                e.Email.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            var isActive = filter.Status == "active";
            query = query.Where(e => e.IsActive == isActive);
        }

        if (!string.IsNullOrWhiteSpace(filter.Department))
            query = query.Where(e => e.Department == filter.Department);

        return query;
    }

    public async Task<List<EmployeeDto>> GetFilteredDtosAsync(EmployeeFilter filter, string? search)
    {
        var entities = await GetFilteredQueryable(filter, search).ToListAsync();
        return entities.Select(MapToDto).ToList();
    }

    public static List<ExportColumn<EmployeeDto>> GetExportColumns() => new()
    {
        new() { Header = "Last Name",   Width = 18, ValueSelector = e => e.LastName },
        new() { Header = "First Name",  Width = 16, ValueSelector = e => e.FirstName },
        new() { Header = "Department",  Width = 16, ValueSelector = e => e.Department ?? "" },
        new() { Header = "Email",       Width = 28, ValueSelector = e => e.Email },
        new() { Header = "Phone",       Width = 16, ValueSelector = e => e.Phone ?? "" },
        new() { Header = "Active",      Width = 8,  ValueSelector = e => e.IsActive ? "Yes" : "No" },
    };

    private static EmployeeDto MapToDto(Employee e) => new()
    {
        EmployeeId = e.EmployeeId,
        FirstName = e.FirstName,
        LastName = e.LastName,
        Department = e.Department,
        Email = e.Email,
        Phone = e.Phone,
        IsActive = e.IsActive,
        HasDriverProfile = e.Driver != null && !e.Driver.IsDeleted,
        HasAppUser = e.AppUser != null && e.AppUser.IsActive
    };
}

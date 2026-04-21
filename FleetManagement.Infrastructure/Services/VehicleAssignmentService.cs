using System.Linq.Expressions;
using FleetManagement.Application.Common;
using FleetManagement.Application.Common.Filters;
using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using static FleetManagement.Application.Exceptions.ErrorMessageKeys;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FleetManagement.Infrastructure.Services;

public class VehicleAssignmentService
{
    private readonly FleetDbContext _db;
    private readonly ILogger<VehicleAssignmentService> _logger;

    public VehicleAssignmentService(FleetDbContext db, ILogger<VehicleAssignmentService> logger)
    {
        _db = db;
        _logger = logger;
    }

    private IQueryable<VehicleAssignment> BaseQuery() =>
        _db.VehicleAssignments
            .Include(a => a.Vehicle).ThenInclude(v => v.Make)
            .Include(a => a.Vehicle).ThenInclude(v => v.Model)
            .Include(a => a.Driver).ThenInclude(d => d.Employee);

    private static readonly Dictionary<string, Expression<Func<VehicleAssignment, object>>> AllowedSorts = new(StringComparer.OrdinalIgnoreCase)
    {
        ["vehicle"]      = a => a.Vehicle.RegistrationNumber,
        ["driver"]       = a => a.Driver.Employee.LastName,
        ["assignedFrom"] = a => a.AssignedFrom,
        ["assignedTo"]   = a => a.AssignedTo!
    };

    public async Task<PagedResponse<VehicleAssignmentDto>> GetPagedAsync(PagedRequest<AssignmentFilter> request)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLower();
            query = query.Where(a =>
                a.Vehicle.RegistrationNumber.ToLower().Contains(term) ||
                (a.Driver.Employee.FirstName + " " + a.Driver.Employee.LastName).ToLower().Contains(term));
        }

        var f = request.Filter;
        var today = DateOnly.FromDateTime(DateTime.Today);

        if (!string.IsNullOrWhiteSpace(f.Status))
        {
            query = f.Status switch
            {
                "active" => query.Where(a => a.AssignedTo == null || a.AssignedTo >= today),
                "ended"  => query.Where(a => a.AssignedTo != null && a.AssignedTo < today),
                _        => query
            };
        }

        if (f.VehicleId.HasValue)
            query = query.Where(a => a.VehicleId == f.VehicleId.Value);

        if (f.DriverId.HasValue)
            query = query.Where(a => a.DriverId == f.DriverId.Value);

        var totalCount = await query.CountAsync();

        var entities = await query
            .ApplySort(request.SortBy, request.IsDescending, AllowedSorts, a => a.AssignedFrom)
            .ApplyPaging(request.Skip, request.PageSize)
            .ToListAsync();

        var items = entities.Select(MapToDto).ToList();

        return PagedResponse<VehicleAssignmentDto>.Create(items, totalCount, request.Page, request.PageSize);
    }

    public async Task<IEnumerable<VehicleAssignmentDto>> GetAllAsync(bool activeOnly = false)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var query = BaseQuery().OrderByDescending(a => a.AssignedFrom);

        if (activeOnly)
            query = (IOrderedQueryable<VehicleAssignment>)query.Where(a => a.AssignedTo == null || a.AssignedTo >= today);

        var list = await query.ToListAsync();
        return list.Select(MapToDto);
    }

    public async Task<VehicleAssignmentDto?> GetByIdAsync(int id)
    {
        var assignment = await BaseQuery().FirstOrDefaultAsync(a => a.AssignmentId == id);
        if (assignment == null) throw new NotFoundException($"Assignment with id {id} was not found.");
        return MapToDto(assignment);
    }

    public async Task<IEnumerable<VehicleAssignmentDto>> GetByVehicleIdAsync(int vehicleId)
    {
        var assignments = await BaseQuery()
            .Where(a => a.VehicleId == vehicleId)
            .OrderByDescending(a => a.AssignedFrom)
            .ToListAsync();
        return assignments.Select(MapToDto);
    }

    public async Task<IEnumerable<VehicleAssignmentDto>> GetByDriverIdAsync(int driverId)
    {
        var assignments = await BaseQuery()
            .Where(a => a.DriverId == driverId)
            .OrderByDescending(a => a.AssignedFrom)
            .ToListAsync();
        return assignments.Select(MapToDto);
    }

    public async Task<VehicleAssignmentDto?> GetActiveByVehicleIdAsync(int vehicleId)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var assignment = await BaseQuery()
            .FirstOrDefaultAsync(a => a.VehicleId == vehicleId &&
                (a.AssignedTo == null || a.AssignedTo >= today));
        return assignment == null ? null : MapToDto(assignment);
    }

    public async Task<bool> VehicleHasActiveAssignmentAsync(int vehicleId)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        return await _db.VehicleAssignments
            .AnyAsync(a => a.VehicleId == vehicleId &&
                (a.AssignedTo == null || a.AssignedTo >= today));
    }

    public async Task<VehicleAssignmentDto> CreateAsync(CreateVehicleAssignmentDto dto)
    {
        if (await VehicleHasActiveAssignmentAsync(dto.VehicleId))
        {
            _logger.LogWarning("Assignment conflict: vehicle {VehicleId} already has an active assignment", dto.VehicleId);
            throw new ConflictException(ErrorMessageKeys.VehicleAssignmentActiveConflict);
        }

        var assignment = new VehicleAssignment
        {
            VehicleId = dto.VehicleId,
            DriverId = dto.DriverId,
            AssignedFrom = dto.AssignedFrom,
            AssignedTo = dto.AssignedTo,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _db.VehicleAssignments.Add(assignment);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Assignment {AssignmentId} created: vehicle {VehicleId} assigned to driver {DriverId}",
            assignment.AssignmentId, assignment.VehicleId, assignment.DriverId);

        return MapToDto(await BaseQuery().FirstAsync(a => a.AssignmentId == assignment.AssignmentId));
    }

    public async Task<VehicleAssignmentDto?> UpdateAsync(int id, UpdateVehicleAssignmentDto dto)
    {
        var assignment = await _db.VehicleAssignments.FindAsync(id);
        if (assignment == null) throw new NotFoundException($"Assignment with id {id} was not found.");

        if (dto.AssignedTo.HasValue) assignment.AssignedTo = dto.AssignedTo;
        if (dto.Notes != null) assignment.Notes = dto.Notes;
        assignment.ModifiedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return MapToDto(await BaseQuery().FirstAsync(a => a.AssignmentId == id));
    }

    public async Task<bool> EndAssignmentAsync(int id)
    {
        var assignment = await _db.VehicleAssignments.FindAsync(id);
        if (assignment == null) return false;

        var today = DateOnly.FromDateTime(DateTime.Today);
        if (assignment.AssignedTo != null && assignment.AssignedTo < today) return false; // already ended

        assignment.AssignedTo = today;
        assignment.ModifiedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Assignment {AssignmentId} ended", id);
        return true;
    }

    public IQueryable<VehicleAssignment> GetFilteredQueryable(AssignmentFilter filter, string? search)
    {
        var query = BaseQuery();
        var today = DateOnly.FromDateTime(DateTime.Today);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(a =>
                a.Vehicle.RegistrationNumber.ToLower().Contains(term) ||
                (a.Driver.Employee.FirstName + " " + a.Driver.Employee.LastName).ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            query = filter.Status switch
            {
                "active" => query.Where(a => a.AssignedTo == null || a.AssignedTo >= today),
                "ended"  => query.Where(a => a.AssignedTo != null && a.AssignedTo < today),
                _        => query
            };
        }

        if (filter.VehicleId.HasValue)
            query = query.Where(a => a.VehicleId == filter.VehicleId.Value);

        if (filter.DriverId.HasValue)
            query = query.Where(a => a.DriverId == filter.DriverId.Value);

        return query;
    }

    public async Task<List<VehicleAssignmentDto>> GetFilteredDtosAsync(AssignmentFilter filter, string? search)
    {
        var entities = await GetFilteredQueryable(filter, search).ToListAsync();
        return entities.Select(MapToDto).ToList();
    }

    public static List<ExportColumn<VehicleAssignmentDto>> GetExportColumns(string lang = "hr") => new()
    {
        new() { Header = lang == "hr" ? "Vozilo"      : "Vehicle",       Width = 18, ValueSelector = a => a.RegistrationNumber },
        new() { Header = lang == "hr" ? "Vozač"       : "Driver",        Width = 22, ValueSelector = a => a.DriverFullName },
        new() { Header = lang == "hr" ? "Odjel"       : "Department",    Width = 16, ValueSelector = a => a.Department ?? "" },
        new() { Header = lang == "hr" ? "Dodjeljeno"  : "Assigned From", Width = 14, ValueSelector = a => a.AssignedFrom },
        new() { Header = lang == "hr" ? "Završeno"    : "Assigned To",   Width = 14, ValueSelector = a => a.AssignedTo?.ToString() ?? (lang == "hr" ? "Aktivno" : "Active") },
        new() { Header = lang == "hr" ? "Status"      : "Status",        Width = 10, ValueSelector = a => a.IsActive ? (lang == "hr" ? "Aktivno" : "Active") : (lang == "hr" ? "Završeno" : "Ended") },
    };

    private static VehicleAssignmentDto MapToDto(VehicleAssignment a) => new()
    {
        AssignmentId = a.AssignmentId,
        VehicleId = a.VehicleId,
        RegistrationNumber = a.Vehicle?.RegistrationNumber ?? string.Empty,
        VehicleMake = a.Vehicle?.Make?.Name ?? string.Empty,
        VehicleModel = a.Vehicle?.Model?.Name ?? string.Empty,
        DriverId = a.DriverId,
        DriverFullName = a.Driver?.Employee != null
            ? $"{a.Driver.Employee.FirstName} {a.Driver.Employee.LastName}"
            : string.Empty,
        Department = a.Driver?.Employee?.Department,
        AssignedFrom = a.AssignedFrom,
        AssignedTo = a.AssignedTo,
        Notes = a.Notes
    };
}

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

public class MaintenanceOrderService
{
    private readonly FleetDbContext _db;
    private readonly ILogger<MaintenanceOrderService> _logger;

    public MaintenanceOrderService(FleetDbContext db, ILogger<MaintenanceOrderService> logger)
    {
        _db = db;
        _logger = logger;
    }

    private IQueryable<MaintenanceOrder> BaseQuery() =>
        _db.MaintenanceOrders
            .Include(o => o.Vehicle).ThenInclude(v => v.Make)
            .Include(o => o.Vehicle).ThenInclude(v => v.Model)
            .Include(o => o.Vendor)
            .Include(o => o.Items).ThenInclude(i => i.MaintenanceType);

    private static readonly Dictionary<string, Expression<Func<MaintenanceOrder, object>>> AllowedSorts = new(StringComparer.OrdinalIgnoreCase)
    {
        ["vehicle"]     = o => o.Vehicle.RegistrationNumber,
        ["vendor"]      = o => o.Vendor!.Name,
        ["status"]      = o => o.Status,
        ["reportedAt"]  = o => o.ReportedAt,
        ["scheduledAt"] = o => o.ScheduledAt!,
        ["totalCost"]   = o => o.TotalCost!
    };

    public async Task<PagedResponse<MaintenanceOrderDto>> GetPagedAsync(PagedRequest<MaintenanceFilter> request)
    {
        var query = GetFilteredQueryable(request.Filter, request.Search);

        var totalCount = await query.CountAsync();

        var entities = await query
            .ApplySort(request.SortBy, request.IsDescending, AllowedSorts, o => o.ReportedAt)
            .ApplyPaging(request.Skip, request.PageSize)
            .ToListAsync();

        return PagedResponse<MaintenanceOrderDto>.Create(
            entities.Select(MapToDto).ToList(), totalCount, request.Page, request.PageSize);
    }

    public IQueryable<MaintenanceOrder> GetFilteredQueryable(MaintenanceFilter filter, string? search)
    {
        var query = BaseQuery();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(o =>
                o.Vehicle.RegistrationNumber.ToLower().Contains(term) ||
                (o.Description != null && o.Description.ToLower().Contains(term)) ||
                (o.Vendor != null && o.Vendor.Name.ToLower().Contains(term)));
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
            query = query.Where(o => o.Status == filter.Status);

        if (filter.VehicleId.HasValue)
            query = query.Where(o => o.VehicleId == filter.VehicleId.Value);

        if (filter.VendorId.HasValue)
            query = query.Where(o => o.VendorId == filter.VendorId.Value);

        if (filter.MaintenanceTypeId.HasValue)
            query = query.Where(o => o.Items.Any(i => i.MaintenanceTypeId == filter.MaintenanceTypeId.Value));

        if (filter.DateFrom.HasValue)
            query = query.Where(o => DateOnly.FromDateTime(o.ReportedAt) >= filter.DateFrom.Value);

        if (filter.DateTo.HasValue)
            query = query.Where(o => DateOnly.FromDateTime(o.ReportedAt) <= filter.DateTo.Value);

        return query;
    }

    public async Task<IEnumerable<MaintenanceOrderDto>> GetAllAsync() =>
        await BaseQuery()
            .OrderByDescending(o => o.ReportedAt)
            .Select(o => MapToDto(o))
            .ToListAsync();

    public async Task<MaintenanceOrderDto?> GetByIdAsync(int id)
    {
        var order = await BaseQuery().FirstOrDefaultAsync(o => o.OrderId == id);
        if (order == null) throw new NotFoundException($"Maintenance order with id {id} was not found.");
        return MapToDto(order);
    }

    public async Task<IEnumerable<MaintenanceOrderDto>> GetByVehicleIdAsync(int vehicleId) =>
        await BaseQuery()
            .Where(o => o.VehicleId == vehicleId)
            .OrderByDescending(o => o.ReportedAt)
            .Select(o => MapToDto(o))
            .ToListAsync();

    public async Task<MaintenanceOrderDto> CreateAsync(CreateMaintenanceOrderDto dto)
    {
        var order = new MaintenanceOrder
        {
            VehicleId = dto.VehicleId,
            VendorId = dto.VendorId,
            ScheduledAt = DateTime.SpecifyKind(dto.ScheduledAt, DateTimeKind.Utc),
            OdometerKm = dto.OdometerKm,
            Description = dto.Description,
            Status = "open",
            ReportedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        _db.MaintenanceOrders.Add(order);
        await _db.SaveChangesAsync();
        return MapToDto(await BaseQuery().FirstAsync(o => o.OrderId == order.OrderId));
    }

    public async Task<MaintenanceOrderDto?> UpdateAsync(int id, UpdateMaintenanceOrderDto dto)
    {
        var order = await _db.MaintenanceOrders.FindAsync(id);
        if (order == null) throw new NotFoundException($"Maintenance order with id {id} was not found.");

        if (order.Status == "closed" || order.Status == "cancelled")
            throw new NotFoundException($"Maintenance order with id {id} was not found.");

        order.VendorId = dto.VendorId;
        order.ScheduledAt = dto.ScheduledAt.HasValue ? DateTime.SpecifyKind(dto.ScheduledAt.Value, DateTimeKind.Utc) : dto.ScheduledAt;
        order.Description = dto.Description;
        order.ModifiedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return MapToDto(await BaseQuery().FirstAsync(o => o.OrderId == id));
    }

    public async Task<MaintenanceOrderDto?> StartAsync(int id)
    {
        var order = await _db.MaintenanceOrders.FindAsync(id);

        var validTransitions = new Dictionary<string, string[]>
        {
            { "open", new[] { "in_progress" } },
            { "in_progress", new[] { "closed", "cancelled" } }
        };

        if (order == null || !validTransitions.TryGetValue(order.Status, out var allowed) || !allowed.Contains("in_progress"))
        {
            _logger.LogWarning("Invalid status transition attempt: cannot start order {Id}", id);
            throw new NotFoundException("Order not found or cannot be started from its current status.");
        }

        order.Status = "in_progress";
        var vehicle = await _db.Vehicles.FindAsync(order.VehicleId);
        if (vehicle != null)
            vehicle.Status = "service";

        order.ModifiedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Order {Id} status changed to {Status}", id, "in_progress");
        return MapToDto(await BaseQuery().FirstAsync(o => o.OrderId == id));
    }

    public async Task<MaintenanceOrderDto?> CloseAsync(int id, CloseMaintenanceOrderDto dto)
    {
        var order = await _db.MaintenanceOrders
            .Include(o => o.Items)
            .Include(o => o.Vehicle)
            .FirstOrDefaultAsync(o => o.OrderId == id);

        if (order == null || order.Status != "in_progress" || !order.Items.Any())
        {
            _logger.LogWarning("Invalid status transition attempt: cannot close order {Id}", id);
            throw new NotFoundException("Order not found, not in_progress, or has no items. Add at least one item before closing.");
        }

        order.TotalCost = order.Items.Sum(i => i.PartsCost + i.LaborCost);
        order.Status = "closed";
        order.ClosedAt = DateTime.UtcNow;
        order.ModifiedAt = DateTime.UtcNow;

        if (dto.OdometerKm.HasValue && order.Vehicle != null &&
            dto.OdometerKm.Value > order.Vehicle.CurrentOdometerKm)
        {
            order.OdometerKm = dto.OdometerKm.Value;
            order.Vehicle.CurrentOdometerKm = dto.OdometerKm.Value;
            order.Vehicle.ModifiedAt = DateTime.UtcNow;

            _db.OdometerLogs.Add(new OdometerLog
            {
                VehicleId = order.VehicleId,
                OdometerKm = dto.OdometerKm.Value,
                LogDate = DateOnly.FromDateTime(DateTime.Today),
                Notes = $"Auto-logged from maintenance order #{order.OrderId}",
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation("Order {Id} status changed to {Status}", id, "closed");
        return MapToDto(await BaseQuery().FirstAsync(o => o.OrderId == id));
    }

    public async Task<MaintenanceOrderDto?> CancelAsync(int id, CancelMaintenanceOrderDto dto)
    {
        var order = await _db.MaintenanceOrders.FindAsync(id);
        if (order == null || order.Status == "closed" || order.Status == "cancelled")
        {
            _logger.LogWarning("Invalid status transition attempt: cannot cancel order {Id}", id);
            throw new NotFoundException("Order not found or already closed/cancelled.");
        }

        order.Status = "cancelled";
        order.CancelReason = dto.CancelReason;
        order.ModifiedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Order {Id} status changed to {Status}", id, "cancelled");
        return MapToDto(await BaseQuery().FirstAsync(o => o.OrderId == id));
    }

    public async Task<MaintenanceItemDto> AddItemAsync(int orderId, CreateMaintenanceItemDto dto)
    {
        var order = await _db.MaintenanceOrders.FindAsync(orderId);
        if (order == null) throw new NotFoundException("Order not found.");
        if (order.Status == "closed" || order.Status == "cancelled")
            throw new ConflictException("Cannot add items to a closed or cancelled order.");

        var item = new MaintenanceItem
        {
            OrderId = orderId,
            MaintenanceTypeId = dto.MaintenanceTypeId,
            PartsCost = dto.PartsCost,
            LaborCost = dto.LaborCost,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _db.MaintenanceItems.Add(item);
        await _db.SaveChangesAsync();

        await _db.Entry(item).Reference(i => i.MaintenanceType).LoadAsync();
        return MapItemToDto(item);
    }

    public async Task<bool> DeleteItemAsync(int itemId)
    {
        var item = await _db.MaintenanceItems.FindAsync(itemId);
        if (item == null) throw new NotFoundException("Item not found or order is already closed/cancelled.");

        var order = await _db.MaintenanceOrders.FindAsync(item.OrderId);
        if (order?.Status == "closed" || order?.Status == "cancelled")
            throw new NotFoundException("Item not found or order is already closed/cancelled.");

        _db.MaintenanceItems.Remove(item);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<MaintenanceOrderDto>> GetFilteredDtosAsync(MaintenanceFilter filter, string? search)
    {
        var entities = await GetFilteredQueryable(filter, search).ToListAsync();
        return entities.Select(MapToDto).ToList();
    }

    public static List<ExportColumn<MaintenanceOrderDto>> GetExportColumns(string lang = "hr") => new()
    {
        new() { Header = lang == "hr" ? "Vozilo"      : "Vehicle",     Width = 16, ValueSelector = o => o.RegistrationNumber },
        new() { Header = lang == "hr" ? "Servis"      : "Vendor",      Width = 18, ValueSelector = o => o.VendorName ?? "" },
        new() { Header = lang == "hr" ? "Status"      : "Status",      Width = 12, ValueSelector = o => o.Status },
        new() { Header = lang == "hr" ? "Prijavljeno" : "Reported",    Width = 14, ValueSelector = o => o.ReportedAt },
        new() { Header = lang == "hr" ? "Zakazano"    : "Scheduled",   Width = 14, ValueSelector = o => o.ScheduledAt?.ToString("d") ?? "" },
        new() { Header = lang == "hr" ? "Zatvoreno"   : "Closed",      Width = 14, ValueSelector = o => o.ClosedAt?.ToString("d") ?? "" },
        new() { Header = lang == "hr" ? "Ukupno"      : "Total Cost",  Width = 12, ValueSelector = o => o.TotalCost ?? 0m },
        new() { Header = lang == "hr" ? "Opis"        : "Description", Width = 30, ValueSelector = o => o.Description ?? "" },
    };

    private static MaintenanceOrderDto MapToDto(MaintenanceOrder o) => new()
    {
        OrderId = o.OrderId,
        VehicleId = o.VehicleId,
        RegistrationNumber = o.Vehicle?.RegistrationNumber ?? string.Empty,
        VehicleMake = o.Vehicle?.Make?.Name ?? string.Empty,
        VehicleModel = o.Vehicle?.Model?.Name ?? string.Empty,
        VendorId = o.VendorId,
        VendorName = o.Vendor?.Name,
        Status = o.Status,
        ReportedAt = o.ReportedAt,
        ScheduledAt = o.ScheduledAt,
        ClosedAt = o.ClosedAt,
        OdometerKm = o.OdometerKm,
        TotalCost = o.TotalCost,
        Description = o.Description,
        CancelReason = o.CancelReason,
        Items = o.Items.Select(MapItemToDto).ToList()
    };

    private static MaintenanceItemDto MapItemToDto(MaintenanceItem i) => new()
    {
        ItemId = i.ItemId,
        OrderId = i.OrderId,
        MaintenanceTypeId = i.MaintenanceTypeId,
        MaintenanceTypeName = i.MaintenanceType?.Name ?? string.Empty,
        PartsCost = i.PartsCost,
        LaborCost = i.LaborCost,
        Notes = i.Notes
    };
}

using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using FleetManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FleetManagement.Infrastructure.Repositories;

public class MaintenanceOrderRepository : IMaintenanceOrderRepository
{
    private readonly FleetDbContext _context;
    public MaintenanceOrderRepository(FleetDbContext context) => _context = context;

    private IQueryable<MaintenanceOrder> BaseQuery() =>
        _context.MaintenanceOrders
            .Include(o => o.Vehicle)
            .Include(o => o.Vendor)
            .Include(o => o.Items);

    public async Task<IEnumerable<MaintenanceOrder>> GetAllAsync() =>
        await BaseQuery()
            .OrderByDescending(o => o.ReportedAt)
            .ToListAsync();

    public async Task<IEnumerable<MaintenanceOrder>> GetByVehicleIdAsync(int vehicleId) =>
        await BaseQuery()
            .Where(o => o.VehicleId == vehicleId)
            .OrderByDescending(o => o.ReportedAt)
            .ToListAsync();

    public async Task<MaintenanceOrder?> GetByIdAsync(int id) =>
        await BaseQuery().FirstOrDefaultAsync(o => o.OrderId == id);

    public async Task<MaintenanceOrder> CreateAsync(MaintenanceOrder order)
    {
        order.Status = "open";
        order.ReportedAt = DateTime.UtcNow;
        order.CreatedAt = DateTime.UtcNow;
        _context.MaintenanceOrders.Add(order);
        await _context.SaveChangesAsync();
        return await BaseQuery().FirstAsync(o => o.OrderId == order.OrderId);
    }

    public async Task<MaintenanceOrder?> UpdateAsync(int id, MaintenanceOrder updated)
    {
        var order = await _context.MaintenanceOrders.FindAsync(id);
        if (order == null) return null;

        // Only open or in_progress orders can be updated
        if (order.Status == "closed" || order.Status == "cancelled")
            return null;

        order.VendorId = updated.VendorId;
        order.ScheduledAt = updated.ScheduledAt.HasValue ? DateTime.SpecifyKind(updated.ScheduledAt.Value, DateTimeKind.Utc) : updated.ScheduledAt;
        order.Description = updated.Description;
        order.ModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await BaseQuery().FirstAsync(o => o.OrderId == id);
    }

    public async Task<MaintenanceOrder?> SetStatusAsync(int id, string newStatus)
    {
        var order = await _context.MaintenanceOrders.FindAsync(id);
        if (order == null) return null;

        // Enforce valid transitions: open → in_progress
        var validTransitions = new Dictionary<string, string[]>
        {
            { "open", new[] { "in_progress" } },
            { "in_progress", new[] { "closed", "cancelled" } }
        };

        if (!validTransitions.TryGetValue(order.Status, out var allowed) ||
            !allowed.Contains(newStatus))
            return null;

        order.Status = newStatus;
        if (newStatus == "in_progress")
        {
            var vehicle = await _context.Vehicles.FindAsync(order.VehicleId);
            if (vehicle != null)
            {
                vehicle.Status = "service";
            }
        }
        order.ModifiedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return await BaseQuery().FirstAsync(o => o.OrderId == id);
    }

    public async Task<MaintenanceOrder?> CloseAsync(int id, int? odometerKm)
    {
        var order = await _context.MaintenanceOrders
            .Include(o => o.Items)
            .Include(o => o.Vehicle)
            .FirstOrDefaultAsync(o => o.OrderId == id);

        if (order == null) return null;

        // Must be in_progress to close
        if (order.Status != "in_progress") return null;

        // Must have at least one item
        if (!order.Items.Any()) return null;

        // Calculate total cost from items
        order.TotalCost = order.Items.Sum(i => i.PartsCost + i.LaborCost);
        order.Status = "closed";
        order.ClosedAt = DateTime.UtcNow;
        order.ModifiedAt = DateTime.UtcNow;

        // Auto-update odometer if provided and higher than current
        if (odometerKm.HasValue && order.Vehicle != null &&
            odometerKm.Value > order.Vehicle.CurrentOdometerKm)
        {
            order.OdometerKm = odometerKm.Value;
            order.Vehicle.CurrentOdometerKm = odometerKm.Value;
            order.Vehicle.ModifiedAt = DateTime.UtcNow;

            // Also log the odometer reading
            _context.OdometerLogs.Add(new OdometerLog
            {
                VehicleId = order.VehicleId,
                OdometerKm = odometerKm.Value,
                LogDate = DateOnly.FromDateTime(DateTime.Today),
                Notes = $"Auto-logged from maintenance order #{order.OrderId}",
                CreatedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();
        return await BaseQuery().FirstAsync(o => o.OrderId == id);
    }

    public async Task<MaintenanceOrder?> CancelAsync(int id, string cancelReason)
    {
        var order = await _context.MaintenanceOrders.FindAsync(id);
        if (order == null) return null;

        // Can only cancel open or in_progress orders
        if (order.Status == "closed" || order.Status == "cancelled") return null;

        order.Status = "cancelled";
        order.CancelReason = cancelReason;
        order.ModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await BaseQuery().FirstAsync(o => o.OrderId == id);
    }

    public async Task<MaintenanceItem> AddItemAsync(int orderId, MaintenanceItem item)
    {
        item.OrderId = orderId;
        item.CreatedAt = DateTime.UtcNow;
        _context.MaintenanceItems.Add(item);
        await _context.SaveChangesAsync();
        return item;
    }

    public async Task<bool> DeleteItemAsync(int itemId)
    {
        var item = await _context.MaintenanceItems.FindAsync(itemId);
        if (item == null) return false;

        // Cannot delete items from closed/cancelled orders
        var order = await _context.MaintenanceOrders.FindAsync(item.OrderId);
        if (order?.Status == "closed" || order?.Status == "cancelled") return false;

        _context.MaintenanceItems.Remove(item);
        await _context.SaveChangesAsync();
        return true;
    }
}
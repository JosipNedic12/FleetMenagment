using FleetManagement.Application.DTOs;
using FleetManagement.Application.Exceptions;
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace FleetManagement.Infrastructure.Services;

public class MaintenanceOrderService : IMaintenanceOrderService
{
    private readonly IMaintenanceOrderRepository _repo;
    private readonly ILogger<MaintenanceOrderService> _logger;

    public MaintenanceOrderService(IMaintenanceOrderRepository repo, ILogger<MaintenanceOrderService> logger)
    {
        _repo = repo;
        _logger = logger;
    }

    public async Task<IEnumerable<MaintenanceOrderDto>> GetAllAsync()
    {
        var orders = await _repo.GetAllAsync();
        return orders.Select(MapToDto);
    }

    public async Task<MaintenanceOrderDto?> GetByIdAsync(int id)
    {
        var order = await _repo.GetByIdAsync(id);
        if (order == null) throw new NotFoundException($"Maintenance order with id {id} was not found.");
        return MapToDto(order);
    }

    public async Task<IEnumerable<MaintenanceOrderDto>> GetByVehicleIdAsync(int vehicleId)
    {
        var orders = await _repo.GetByVehicleIdAsync(vehicleId);
        return orders.Select(MapToDto);
    }

    public async Task<MaintenanceOrderDto> CreateAsync(CreateMaintenanceOrderDto dto)
    {
        var order = new MaintenanceOrder
        {
            VehicleId = dto.VehicleId,
            VendorId = dto.VendorId,
            ScheduledAt = dto.ScheduledAt,
            OdometerKm = dto.OdometerKm,
            Description = dto.Description
        };

        var created = await _repo.CreateAsync(order);
        return MapToDto(created);
    }

    public async Task<MaintenanceOrderDto?> UpdateAsync(int id, UpdateMaintenanceOrderDto dto)
    {
        var updated = await _repo.UpdateAsync(id, new MaintenanceOrder
        {
            VendorId = dto.VendorId,
            ScheduledAt = dto.ScheduledAt,
            Description = dto.Description
        });

        if (updated == null) throw new NotFoundException($"Maintenance order with id {id} was not found.");
        return MapToDto(updated);
    }

    public async Task<MaintenanceOrderDto?> StartAsync(int id)
    {
        var result = await _repo.SetStatusAsync(id, "in_progress");
        if (result == null)
        {
            _logger.LogWarning("Invalid status transition attempt: cannot start order {Id}", id);
            throw new NotFoundException("Order not found or cannot be started from its current status.");
        }

        _logger.LogInformation("Order {Id} status changed to {Status}", id, "in_progress");
        return MapToDto(result);
    }

    public async Task<MaintenanceOrderDto?> CloseAsync(int id, CloseMaintenanceOrderDto dto)
    {
        var result = await _repo.CloseAsync(id, dto.OdometerKm);
        if (result == null)
        {
            _logger.LogWarning("Invalid status transition attempt: cannot close order {Id}", id);
            throw new NotFoundException("Order not found, not in_progress, or has no items. Add at least one item before closing.");
        }

        _logger.LogInformation("Order {Id} status changed to {Status}", id, "closed");
        return MapToDto(result);
    }

    public async Task<MaintenanceOrderDto?> CancelAsync(int id, CancelMaintenanceOrderDto dto)
    {
        var result = await _repo.CancelAsync(id, dto.CancelReason);
        if (result == null)
        {
            _logger.LogWarning("Invalid status transition attempt: cannot cancel order {Id}", id);
            throw new NotFoundException("Order not found or already closed/cancelled.");
        }

        _logger.LogInformation("Order {Id} status changed to {Status}", id, "cancelled");
        return MapToDto(result);
    }

    public async Task<MaintenanceItemDto> AddItemAsync(int orderId, CreateMaintenanceItemDto dto)
    {
        var order = await _repo.GetByIdAsync(orderId);
        if (order == null) throw new NotFoundException("Order not found.");
        if (order.Status == "closed" || order.Status == "cancelled")
            throw new ConflictException("Cannot add items to a closed or cancelled order.");

        var item = new MaintenanceItem
        {
            MaintenanceTypeId = dto.MaintenanceTypeId,
            PartsCost = dto.PartsCost,
            LaborCost = dto.LaborCost,
            Notes = dto.Notes
        };

        var created = await _repo.AddItemAsync(orderId, item);
        return MapItemToDto(created);
    }

    public async Task<bool> DeleteItemAsync(int itemId)
    {
        var result = await _repo.DeleteItemAsync(itemId);
        if (!result) throw new NotFoundException("Item not found or order is already closed/cancelled.");
        return true;
    }

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

using FleetManagement.Application.DTOs;
using FleetManagement.Application.Interfaces;
using FleetManagement.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MaintenanceOrdersController : ControllerBase
{
    private readonly IMaintenanceOrderRepository _repo;
    public MaintenanceOrdersController(IMaintenanceOrderRepository repo) => _repo = repo;

    [HttpGet]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<MaintenanceOrderDto>>> GetAll()
    {
        var orders = await _repo.GetAllAsync();
        return Ok(orders.Select(MapToDto));
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<MaintenanceOrderDto>> GetById(int id)
    {
        var order = await _repo.GetByIdAsync(id);
        if (order == null) return NotFound();
        return Ok(MapToDto(order));
    }

    [HttpGet("vehicle/{vehicleId}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<MaintenanceOrderDto>>> GetByVehicle(int vehicleId)
    {
        var orders = await _repo.GetByVehicleIdAsync(vehicleId);
        return Ok(orders.Select(MapToDto));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<MaintenanceOrderDto>> Create(CreateMaintenanceOrderDto dto)
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
        return CreatedAtAction(nameof(GetById), new { id = created.OrderId }, MapToDto(created));
    }

    [HttpPatch("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<MaintenanceOrderDto>> Update(int id, UpdateMaintenanceOrderDto dto)
    {
        var updated = await _repo.UpdateAsync(id, new MaintenanceOrder
        {
            VendorId = dto.VendorId,
            ScheduledAt = dto.ScheduledAt,
            Description = dto.Description
        });

        if (updated == null) return NotFound();
        return Ok(MapToDto(updated));
    }

    // POST api/v1/maintenanceorders/5/start  (open → in_progress)
    [HttpPost("{id}/start")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<MaintenanceOrderDto>> Start(int id)
    {
        var result = await _repo.SetStatusAsync(id, "in_progress");
        if (result == null) return BadRequest("Order not found or cannot be started from its current status.");
        return Ok(MapToDto(result));
    }

    // POST api/v1/maintenanceorders/5/close
    [HttpPost("{id}/close")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<MaintenanceOrderDto>> Close(int id, CloseMaintenanceOrderDto dto)
    {
        var result = await _repo.CloseAsync(id, dto.OdometerKm);
        if (result == null)
            return BadRequest("Order not found, not in_progress, or has no items. Add at least one item before closing.");
        return Ok(MapToDto(result));
    }

    // POST api/v1/maintenanceorders/5/cancel
    [HttpPost("{id}/cancel")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<MaintenanceOrderDto>> Cancel(int id, CancelMaintenanceOrderDto dto)
    {
        var result = await _repo.CancelAsync(id, dto.CancelReason);
        if (result == null) return BadRequest("Order not found or already closed/cancelled.");
        return Ok(MapToDto(result));
    }

    // POST api/v1/maintenanceorders/5/items
    [HttpPost("{id}/items")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<MaintenanceItemDto>> AddItem(int id, CreateMaintenanceItemDto dto)
    {
        // Verify order exists and is not closed/cancelled
        var order = await _repo.GetByIdAsync(id);
        if (order == null) return NotFound("Order not found.");
        if (order.Status == "closed" || order.Status == "cancelled")
            return BadRequest("Cannot add items to a closed or cancelled order.");

        var item = new MaintenanceItem
        {
            MaintenanceTypeId = dto.MaintenanceTypeId,
            PartsCost = dto.PartsCost,
            LaborCost = dto.LaborCost,
            Notes = dto.Notes
        };

        var created = await _repo.AddItemAsync(id, item);
        return Ok(MapItemToDto(created));
    }

    // DELETE api/v1/maintenanceorders/items/5
    [HttpDelete("items/{itemId}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> DeleteItem(int itemId)
    {
        var result = await _repo.DeleteItemAsync(itemId);
        if (!result) return NotFound("Item not found or order is already closed/cancelled.");
        return NoContent();
    }

    private static MaintenanceOrderDto MapToDto(MaintenanceOrder o) => new()
    {
        OrderId = o.OrderId,
        VehicleId = o.VehicleId,
        RegistrationNumber = o.Vehicle?.RegistrationNumber ?? string.Empty,
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
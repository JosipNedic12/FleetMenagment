using FleetManagement.Application.Common;
using FleetManagement.Application.Common.Filters;
using FleetManagement.Application.DTOs;
using FleetManagement.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MaintenanceOrdersController : ControllerBase
{
    private readonly MaintenanceOrderService _service;
    private readonly ExportService _exportService;
    private readonly UserActivityService _activity;

    public MaintenanceOrdersController(MaintenanceOrderService service, ExportService exportService, UserActivityService activity)
    {
        _service = service;
        _exportService = exportService;
        _activity = activity;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<PagedResponse<MaintenanceOrderDto>>> GetPaged(
        [FromQuery] PagedRequest<MaintenanceFilter> request)
        => Ok(await _service.GetPagedAsync(request));

    [HttpGet("all")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<MaintenanceOrderDto>>> GetAll()
        => Ok(await _service.GetAllAsync());

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<MaintenanceOrderDto>> GetById(int id)
        => Ok(await _service.GetByIdAsync(id));

    [HttpGet("vehicle/{vehicleId}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<MaintenanceOrderDto>>> GetByVehicle(int vehicleId)
        => Ok(await _service.GetByVehicleIdAsync(vehicleId));

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<MaintenanceOrderDto>> Create(CreateMaintenanceOrderDto dto)
    {
        var result = await _service.CreateAsync(dto);
        await _activity.LogAsync(GetUserId(), "MaintenanceCreated", "MaintenanceOrder", result.OrderId,
            $"Kreiran nalog održavanja za vozilo {result.RegistrationNumber}");
        return CreatedAtAction(nameof(GetById), new { id = result.OrderId }, result);
    }

    [HttpPatch("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<MaintenanceOrderDto>> Update(int id, UpdateMaintenanceOrderDto dto)
        => Ok(await _service.UpdateAsync(id, dto));

    [HttpPost("{id}/start")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<MaintenanceOrderDto>> Start(int id)
        => Ok(await _service.StartAsync(id));

    [HttpPost("{id}/close")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<MaintenanceOrderDto>> Close(int id, CloseMaintenanceOrderDto dto)
        => Ok(await _service.CloseAsync(id, dto));

    [HttpPost("{id}/cancel")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<MaintenanceOrderDto>> Cancel(int id, CancelMaintenanceOrderDto dto)
        => Ok(await _service.CancelAsync(id, dto));

    [HttpPost("{id}/items")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<MaintenanceItemDto>> AddItem(int id, CreateMaintenanceItemDto dto)
        => Ok(await _service.AddItemAsync(id, dto));

    [HttpDelete("items/{itemId}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> DeleteItem(int itemId)
    {
        await _service.DeleteItemAsync(itemId);
        return NoContent();
    }

    [HttpGet("export")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Export([FromQuery] string format, [FromQuery] string? search, [FromQuery] MaintenanceFilter? filter)
    {
        var dtos = await _service.GetFilteredDtosAsync(filter ?? new MaintenanceFilter(), search);
        var columns = MaintenanceOrderService.GetExportColumns();
        if (format?.ToLower() == "pdf")
        {
            var bytes = _exportService.ExportToPdf(dtos, columns, "Maintenance Orders Report", $"{dtos.Count} records · Exported {DateTime.Now:dd.MM.yyyy}");
            return File(bytes, "application/pdf", $"maintenance_{DateTime.Now:yyyyMMdd}.pdf");
        }
        else
        {
            var bytes = _exportService.ExportToExcel(dtos, columns, "Maintenance Orders");
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"maintenance_{DateTime.Now:yyyyMMdd}.xlsx");
        }
    }

    private int GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return int.TryParse(claim, out var id) ? id : 0;
    }
}

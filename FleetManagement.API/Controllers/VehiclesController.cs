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
public class VehiclesController : ControllerBase
{
    private readonly VehicleService _service;
    private readonly ExportService _exportService;
    private readonly UserActivityService _activity;

    public VehiclesController(VehicleService service, ExportService exportService, UserActivityService activity)
    {
        _service = service;
        _exportService = exportService;
        _activity = activity;
    }

    // NEW: Paginated + filtered list
    [HttpGet]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<PagedResponse<VehicleDto>>> GetPaged(
        [FromQuery] PagedRequest<VehicleFilter> request)
        => Ok(await _service.GetPagedAsync(request));

    // Keep for dropdowns, detail-page lookups, etc.
    [HttpGet("all")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<VehicleDto>>> GetAll()
        => Ok(await _service.GetAllAsync());

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<VehicleDto>> GetById(int id)
        => Ok(await _service.GetByIdAsync(id));

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<VehicleDto>> Create(CreateVehicleDto dto)
    {
        var result = await _service.CreateAsync(dto);
        await _activity.LogAsync(GetUserId(), "VehicleCreated", "Vehicle", result.VehicleId,
            $"Dodano vozilo {result.RegistrationNumber}");
        return CreatedAtAction(nameof(GetById), new { id = result.VehicleId }, result);
    }

    [HttpPatch("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<VehicleDto>> Update(int id, UpdateVehicleDto dto)
    {
        var result = await _service.UpdateAsync(id, dto);
        await _activity.LogAsync(GetUserId(), "VehicleUpdated", "Vehicle", id,
            $"Ažurirano vozilo {result.RegistrationNumber}");
        return Ok(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        await _activity.LogAsync(GetUserId(), "VehicleDeleted", "Vehicle", id,
            $"Obrisano vozilo (ID: {id})");
        return NoContent();
    }

    [HttpGet("export")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Export([FromQuery] string format, [FromQuery] string? search, [FromQuery] VehicleFilter? filter)
    {
        var dtos = await _service.GetFilteredDtosAsync(filter ?? new VehicleFilter(), search);
        var columns = VehicleService.GetExportColumns();
        if (format?.ToLower() == "pdf")
        {
            var bytes = _exportService.ExportToPdf(dtos, columns, "Vehicles Report", $"{dtos.Count} records · Exported {DateTime.Now:dd.MM.yyyy}");
            return File(bytes, "application/pdf", $"vehicles_{DateTime.Now:yyyyMMdd}.pdf");
        }
        else
        {
            var bytes = _exportService.ExportToExcel(dtos, columns, "Vehicles");
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"vehicles_{DateTime.Now:yyyyMMdd}.xlsx");
        }
    }

    private int GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return int.TryParse(claim, out var id) ? id : 0;
    }
}

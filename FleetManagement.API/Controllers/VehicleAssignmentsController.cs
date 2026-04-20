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
public class VehicleAssignmentsController : ControllerBase
{
    private readonly VehicleAssignmentService _service;
    private readonly ExportService _exportService;
    private readonly UserActivityService _activity;

    public VehicleAssignmentsController(VehicleAssignmentService service, ExportService exportService, UserActivityService activity)
    {
        _service = service;
        _exportService = exportService;
        _activity = activity;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<PagedResponse<VehicleAssignmentDto>>> GetPaged(
        [FromQuery] PagedRequest<AssignmentFilter> request)
        => Ok(await _service.GetPagedAsync(request));

    [HttpGet("all")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<VehicleAssignmentDto>>> GetAll(
        [FromQuery] bool activeOnly = false)
        => Ok(await _service.GetAllAsync(activeOnly));

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<VehicleAssignmentDto>> GetById(int id)
        => Ok(await _service.GetByIdAsync(id));

    [HttpGet("vehicle/{vehicleId}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<VehicleAssignmentDto>>> GetByVehicle(int vehicleId)
        => Ok(await _service.GetByVehicleIdAsync(vehicleId));

    [HttpGet("driver/{driverId}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<VehicleAssignmentDto>>> GetByDriver(int driverId)
        => Ok(await _service.GetByDriverIdAsync(driverId));

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<VehicleAssignmentDto>> Create(CreateVehicleAssignmentDto dto)
    {
        var result = await _service.CreateAsync(dto);
        await _activity.LogAsync(GetUserId(), "VehicleAssigned", "VehicleAssignment", result.AssignmentId,
            $"Vozilo {result.RegistrationNumber} dodijeljeno vozaču {result.DriverFullName}");
        return CreatedAtAction(nameof(GetById), new { id = result.AssignmentId }, result);
    }

    [HttpPatch("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<VehicleAssignmentDto>> Update(int id, UpdateVehicleAssignmentDto dto)
        => Ok(await _service.UpdateAsync(id, dto));

    [HttpPost("{id}/end")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> End(int id)
    {
        var result = await _service.EndAssignmentAsync(id);
        if (!result) return NotFound("Assignment not found or already ended.");
        return NoContent();
    }

    [HttpGet("export")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Export([FromQuery] string format, [FromQuery] string? search, [FromQuery] AssignmentFilter? filter, [FromQuery] string lang = "hr")
    {
        var dtos = await _service.GetFilteredDtosAsync(filter ?? new AssignmentFilter(), search);
        var columns = VehicleAssignmentService.GetExportColumns(lang);
        if (format?.ToLower() == "pdf")
        {
            var title = lang == "hr" ? "Izvještaj dodjela vozila" : "Vehicle Assignments Report";
            var bytes = _exportService.ExportToPdf(dtos, columns, title, $"{dtos.Count} {(lang == "hr" ? "zapisa" : "records")} · {DateTime.Now:dd.MM.yyyy}");
            return File(bytes, "application/pdf", $"{(lang == "hr" ? "dodjele_vozila" : "assignments")}_{DateTime.Now:yyyyMMdd}.pdf");
        }
        else
        {
            var bytes = _exportService.ExportToExcel(dtos, columns, lang == "hr" ? "Dodjele vozila" : "Assignments");
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"{(lang == "hr" ? "dodjele_vozila" : "assignments")}_{DateTime.Now:yyyyMMdd}.xlsx");
        }
    }

    private int GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return int.TryParse(claim, out var id) ? id : 0;
    }
}

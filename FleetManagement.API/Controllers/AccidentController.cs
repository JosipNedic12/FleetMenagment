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
[Authorize]
public class AccidentController : ControllerBase
{
    private readonly AccidentService _svc;
    private readonly ExportService _exportService;
    private readonly UserActivityService _activity;

    public AccidentController(AccidentService svc, ExportService exportService, UserActivityService activity)
    {
        _svc = svc;
        _exportService = exportService;
        _activity = activity;
    }

    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] PagedRequest<AccidentFilter> request) =>
        Ok(await _svc.GetPagedAsync(request));

    [HttpGet("all")]
    public async Task<IActionResult> GetAll() =>
        Ok(await _svc.GetAllAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id) =>
        Ok(await _svc.GetByIdAsync(id));

    [HttpGet("vehicle/{vehicleId}")]
    public async Task<IActionResult> GetByVehicle(int vehicleId) =>
        Ok(await _svc.GetByVehicleIdAsync(vehicleId));

    [HttpGet("driver/{driverId}")]
    public async Task<IActionResult> GetByDriver(int driverId) =>
        Ok(await _svc.GetByDriverIdAsync(driverId));

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Create([FromBody] CreateAccidentDto dto)
    {
        var created = await _svc.CreateAsync(dto);
        await _activity.LogAsync(GetUserId(), "AccidentCreated", "Accident", created.AccidentId,
            $"Evidentirana nezgoda za vozilo {created.RegistrationNumber}");
        return CreatedAtAction(nameof(GetById), new { id = created.AccidentId }, created);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAccidentDto dto) =>
        Ok(await _svc.UpdateAsync(id, dto));

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _svc.DeleteAsync(id);
        return NoContent();
    }

    [HttpGet("export")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Export([FromQuery] string format, [FromQuery] string? search, [FromQuery] AccidentFilter? filter)
    {
        var dtos = await _svc.GetFilteredDtosAsync(filter ?? new AccidentFilter(), search);
        var columns = AccidentService.GetExportColumns();
        if (format?.ToLower() == "pdf")
        {
            var bytes = _exportService.ExportToPdf(dtos, columns, "Accidents Report", $"{dtos.Count} records · Exported {DateTime.Now:dd.MM.yyyy}");
            return File(bytes, "application/pdf", $"accidents_{DateTime.Now:yyyyMMdd}.pdf");
        }
        else
        {
            var bytes = _exportService.ExportToExcel(dtos, columns, "Accidents");
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"accidents_{DateTime.Now:yyyyMMdd}.xlsx");
        }
    }

    private int GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return int.TryParse(claim, out var id) ? id : 0;
    }
}

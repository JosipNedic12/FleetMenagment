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
public class DriversController : ControllerBase
{
    private readonly DriverService _service;
    private readonly ExportService _exportService;
    private readonly UserActivityService _activity;

    public DriversController(DriverService service, ExportService exportService, UserActivityService activity)
    {
        _service = service;
        _exportService = exportService;
        _activity = activity;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<PagedResponse<DriverDto>>> GetPaged(
        [FromQuery] PagedRequest<DriverFilter> request)
        => Ok(await _service.GetPagedAsync(request));

    [HttpGet("all")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<DriverDto>>> GetAll()
        => Ok(await _service.GetAllAsync());

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<DriverDto>> GetById(int id)
        => Ok(await _service.GetByIdAsync(id));

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<DriverDto>> Create(CreateDriverDto dto)
    {
        var result = await _service.CreateAsync(dto);
        await _activity.LogAsync(GetUserId(), "DriverCreated", "Driver", result.DriverId,
            $"Dodan vozač {result.FullName}");
        return CreatedAtAction(nameof(GetById), new { id = result.DriverId }, result);
    }

    [HttpPatch("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<DriverDto>> Update(int id, UpdateDriverDto dto)
    {
        var result = await _service.UpdateAsync(id, dto);
        await _activity.LogAsync(GetUserId(), "DriverUpdated", "Driver", id,
            $"Ažuriran vozač {result.FullName}");
        return Ok(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        await _activity.LogAsync(GetUserId(), "DriverDeleted", "Driver", id,
            $"Obrisan vozač (ID: {id})");
        return NoContent();
    }

    [HttpGet("export")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Export([FromQuery] string format, [FromQuery] string? search, [FromQuery] DriverFilter? filter)
    {
        var dtos = await _service.GetFilteredDtosAsync(filter ?? new DriverFilter(), search);
        var columns = DriverService.GetExportColumns();
        if (format?.ToLower() == "pdf")
        {
            var bytes = _exportService.ExportToPdf(dtos, columns, "Drivers Report", $"{dtos.Count} records · Exported {DateTime.Now:dd.MM.yyyy}");
            return File(bytes, "application/pdf", $"drivers_{DateTime.Now:yyyyMMdd}.pdf");
        }
        else
        {
            var bytes = _exportService.ExportToExcel(dtos, columns, "Drivers");
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"drivers_{DateTime.Now:yyyyMMdd}.xlsx");
        }
    }

    private int GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return int.TryParse(claim, out var id) ? id : 0;
    }
}

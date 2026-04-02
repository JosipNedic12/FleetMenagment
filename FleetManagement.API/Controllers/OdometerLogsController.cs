using FleetManagement.Application.Common;
using FleetManagement.Application.Common.Filters;
using FleetManagement.Application.DTOs;
using FleetManagement.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OdometerLogsController : ControllerBase
{
    private readonly OdometerLogService _service;
    private readonly ExportService _exportService;

    public OdometerLogsController(OdometerLogService service, ExportService exportService)
    {
        _service = service;
        _exportService = exportService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<PagedResponse<OdometerLogDto>>> GetPaged(
        [FromQuery] PagedRequest<OdometerFilter> request)
        => Ok(await _service.GetPagedAsync(request));

    [HttpGet("all")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<OdometerLogDto>>> GetAll()
        => Ok(await _service.GetAllAsync());

    [HttpGet("vehicle/{vehicleId}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<IEnumerable<OdometerLogDto>>> GetByVehicle(int vehicleId)
        => Ok(await _service.GetByVehicleIdAsync(vehicleId));

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,FleetManager,ReadOnly")]
    public async Task<ActionResult<OdometerLogDto>> GetById(int id)
        => Ok(await _service.GetByIdAsync(id));

    [HttpPost]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<OdometerLogDto>> Create(CreateOdometerLogDto dto)
    {
        var result = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.LogId }, result);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }

    [HttpGet("export")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Export([FromQuery] string format, [FromQuery] string? search, [FromQuery] OdometerFilter? filter)
    {
        var dtos = await _service.GetFilteredDtosAsync(filter ?? new OdometerFilter(), search);
        var columns = OdometerLogService.GetExportColumns();
        if (format?.ToLower() == "pdf")
        {
            var bytes = _exportService.ExportToPdf(dtos, columns, "Odometer Logs Report", $"{dtos.Count} records · Exported {DateTime.Now:dd.MM.yyyy}");
            return File(bytes, "application/pdf", $"odometer_{DateTime.Now:yyyyMMdd}.pdf");
        }
        else
        {
            var bytes = _exportService.ExportToExcel(dtos, columns, "Odometer Logs");
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"odometer_{DateTime.Now:yyyyMMdd}.xlsx");
        }
    }
}

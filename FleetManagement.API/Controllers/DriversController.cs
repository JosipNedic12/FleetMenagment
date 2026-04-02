using FleetManagement.Application.Common;
using FleetManagement.Application.Common.Filters;
using FleetManagement.Application.DTOs;
using FleetManagement.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DriversController : ControllerBase
{
    private readonly DriverService _service;
    private readonly ExportService _exportService;

    public DriversController(DriverService service, ExportService exportService)
    {
        _service = service;
        _exportService = exportService;
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
        return CreatedAtAction(nameof(GetById), new { id = result.DriverId }, result);
    }

    [HttpPatch("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<ActionResult<DriverDto>> Update(int id, UpdateDriverDto dto)
        => Ok(await _service.UpdateAsync(id, dto));

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
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
}

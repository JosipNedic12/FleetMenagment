using FleetManagement.Application.Common;
using FleetManagement.Application.Common.Filters;
using FleetManagement.Application.DTOs;
using FleetManagement.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FleetManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FineController : ControllerBase
{
    private readonly FineService _svc;
    private readonly ExportService _exportService;

    public FineController(FineService svc, ExportService exportService)
    {
        _svc = svc;
        _exportService = exportService;
    }

    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] PagedRequest<FineFilter> request) =>
        Ok(await _svc.GetPagedAsync(request));

    [HttpGet("all")]
    public async Task<IActionResult> GetAll() =>
        Ok(await _svc.GetAllAsync());

    [HttpGet("unpaid")]
    public async Task<IActionResult> GetUnpaid() =>
        Ok(await _svc.GetUnpaidAsync());

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
    public async Task<IActionResult> Create([FromBody] CreateFineDto dto)
    {
        var created = await _svc.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.FineId }, created);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateFineDto dto) =>
        Ok(await _svc.UpdateAsync(id, dto));

    // POST instead of PATCH — simpler, no JsonPatch dependency needed
    [HttpPost("{id}/pay")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> MarkPaid(int id, [FromBody] MarkFinePaidDto dto) =>
        Ok(await _svc.MarkPaidAsync(id, dto));

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _svc.DeleteAsync(id);
        return NoContent();
    }

    [HttpGet("export")]
    [Authorize(Roles = "Admin,FleetManager")]
    public async Task<IActionResult> Export([FromQuery] string format, [FromQuery] string? search, [FromQuery] FineFilter? filter)
    {
        var dtos = await _svc.GetFilteredDtosAsync(filter ?? new FineFilter(), search);
        var columns = FineService.GetExportColumns();
        if (format?.ToLower() == "pdf")
        {
            var bytes = _exportService.ExportToPdf(dtos, columns, "Fines Report", $"{dtos.Count} records · Exported {DateTime.Now:dd.MM.yyyy}");
            return File(bytes, "application/pdf", $"fines_{DateTime.Now:yyyyMMdd}.pdf");
        }
        else
        {
            var bytes = _exportService.ExportToExcel(dtos, columns, "Fines");
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"fines_{DateTime.Now:yyyyMMdd}.xlsx");
        }
    }
}
